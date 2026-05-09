from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, func, text
from sqlalchemy.orm import Session

from app.api.dependencies import get_db, require_store_role
from app.db.central.models import AnalyticsSales, Store
from app.db.customer.connection import get_remote_engine
from app.schemas.analytics import (
    BusinessPulseSchema,
    DiscountTimelinePoint,
    FinancialsSchema,
    InventoryValueSchema,
    SellThroughItemSchema,
)
from app.services.finance_calc import (
    calc_aov,
    calc_margin,
    calc_upt,
    discount_share,
)
from app.services.inventory_calc import inventory_turnover, sell_through

router = APIRouter()


def _get_store(db: Session, store_id: str) -> Store:
    store = db.query(Store).filter_by(store_id=store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    return store


def _current_stock_value(store: Store) -> float:
    eng = get_remote_engine(store)
    q = text("""
        SELECT COALESCE(SUM(pv.stock_quantity * p.cost_price), 0) AS val
        FROM product_variants pv
        JOIN products p ON p.id = pv.product_id
    """)
    try:
        with eng.connect() as conn:
            val = conn.execute(q).scalar()
    finally:
        eng.dispose()
    return float(val or 0)


def _pulse_from_mv(db: Session, store_id: str, start_date: datetime):
    try:
        daily = db.execute(
            text("""
                SELECT day, revenue, profit
                FROM mv_daily_sales_by_store
                WHERE store_id = :sid
                  AND day >= :start
                ORDER BY day
            """),
            {"sid": store_id, "start": start_date.date()},
        ).mappings().all()
    except Exception as e:
        db.rollback()
        msg = str(e).lower()
        if "mv_daily_sales_by_store" in msg or "does not exist" in msg:
            return None
        raise

    rev = sum(float(r["revenue"] or 0) for r in daily)
    profit = sum(float(r["profit"] or 0) for r in daily)
    return (rev, profit, daily)


@router.get("/pulse", response_model=BusinessPulseSchema)
def get_business_pulse(
    store_id: str,
    days: int = Query(7, ge=1, le=365),
    db: Session = Depends(get_db),
    _access=Depends(require_store_role()),
):
    start_date = datetime.now(timezone.utc) - timedelta(days=days)

    base_filter = [
        AnalyticsSales.store_id == store_id,
        AnalyticsSales.created_at >= start_date,
    ]

    units_total = (
        db.query(func.coalesce(func.sum(AnalyticsSales.quantity), 0))
        .filter(*base_filter)
        .scalar()
    )
    total_units_sold = int(units_total or 0)

    daily_volume_rows = (
        db.query(
            func.date(AnalyticsSales.created_at).label("day"),
            func.coalesce(func.sum(AnalyticsSales.quantity), 0).label("volume"),
        )
        .filter(*base_filter)
        .group_by("day")
        .all()
    )
    volume_map: dict[str, int] = {str(r.day): int(r.volume or 0) for r in daily_volume_rows}

    mv_result = _pulse_from_mv(db, store_id, start_date)
    if mv_result is not None:
        rev, profit, daily = mv_result
        return BusinessPulseSchema(
            total_revenue=rev,
            total_profit=profit,
            avg_margin=calc_margin(rev, profit),
            total_units_sold=total_units_sold,
            sales_dynamic=[
                {
                    "date": d["day"],
                    "revenue": float(d["revenue"] or 0),
                    "profit": float(d["profit"] or 0),
                    "volume": volume_map.get(str(d["day"]), 0),
                }
                for d in daily
            ],
        )

    totals = db.query(
        func.coalesce(func.sum(AnalyticsSales.revenue), 0).label("rev"),
        func.coalesce(func.sum(AnalyticsSales.gross_profit), 0).label("profit"),
    ).filter(*base_filter).one()

    rev = float(totals.rev or 0)
    profit = float(totals.profit or 0)

    daily = (
        db.query(
            func.date(AnalyticsSales.created_at).label("day"),
            func.sum(AnalyticsSales.revenue).label("rev"),
            func.sum(AnalyticsSales.gross_profit).label("profit"),
        )
        .filter(*base_filter)
        .group_by("day")
        .order_by("day")
        .all()
    )

    return BusinessPulseSchema(
        total_revenue=rev,
        total_profit=profit,
        avg_margin=calc_margin(rev, profit),
        total_units_sold=total_units_sold,
        sales_dynamic=[
            {
                "date": d.day,
                "revenue": float(d.rev or 0),
                "profit": float(d.profit or 0),
                "volume": volume_map.get(str(d.day), 0),
            }
            for d in daily
        ],
    )


@router.get("/financials", response_model=FinancialsSchema)
def get_financials(
    store_id: str,
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    _access=Depends(require_store_role("owner")),
):
    start = datetime.now(timezone.utc) - timedelta(days=days)
    q = db.query(
        func.coalesce(func.sum(AnalyticsSales.revenue), 0).label("rev"),
        func.coalesce(func.sum(AnalyticsSales.cogs), 0).label("cogs"),
        func.coalesce(func.sum(AnalyticsSales.gross_profit), 0).label("profit"),
        func.coalesce(func.sum(AnalyticsSales.quantity), 0).label("units"),
        func.count(func.distinct(AnalyticsSales.transaction_id)).label("receipts"),
    ).filter(
        AnalyticsSales.store_id == store_id,
        AnalyticsSales.created_at >= start,
    ).one()

    rev = float(q.rev or 0)
    cogs = float(q.cogs or 0)
    profit = float(q.profit or 0)
    units = int(q.units or 0)
    receipts = int(q.receipts or 0)

    store = _get_store(db, store_id)
    avg_stock_value = _current_stock_value(store)

    return {
        "revenue": rev,
        "cogs": cogs,
        "gross_profit": profit,
        "margin_perc": calc_margin(rev, profit),
        "units_sold": units,
        "receipts": receipts,
        "aov": calc_aov(rev, receipts),
        "upt": calc_upt(units, receipts),
        "inventory_turnover": inventory_turnover(cogs, avg_stock_value),
        "avg_stock_value_used": avg_stock_value,
    }


@router.get("/inventory-value", response_model=InventoryValueSchema)
def get_inventory_value(
    store_id: str,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    _access=Depends(require_store_role("owner")),
):
    store = _get_store(db, store_id)
    eng = get_remote_engine(store)
    q = text("""
        SELECT
            c.category_name,
            COALESCE(SUM(pv.stock_quantity * p.cost_price), 0)   AS stock_value,
            COALESCE(SUM(pv.stock_quantity * p.retail_price), 0) AS retail_value,
            COALESCE(SUM(pv.stock_quantity), 0)                  AS units
        FROM product_variants pv
        JOIN products p         ON p.id = pv.product_id
        LEFT JOIN categories c  ON c.id = p.category_id
        WHERE (:cat IS NULL OR c.category_name = :cat)
        GROUP BY c.category_name
        ORDER BY stock_value DESC
    """)
    try:
        with eng.connect() as conn:
            rows = conn.execute(q, {"cat": category}).mappings().all()
    finally:
        eng.dispose()

    by_category = [
        {
            "category": r["category_name"] or "Uncategorised",
            "stock_value": float(r["stock_value"] or 0),
            "retail_value": float(r["retail_value"] or 0),
            "units": int(r["units"] or 0),
        }
        for r in rows
    ]
    return {
        "total_stock_value": sum(b["stock_value"] for b in by_category),
        "total_retail_value": sum(b["retail_value"] for b in by_category),
        "total_units": sum(b["units"] for b in by_category),
        "by_category": by_category,
    }


@router.get("/sell-through", response_model=List[SellThroughItemSchema])
def get_sell_through(
    store_id: str,
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    _access=Depends(require_store_role("owner")),
):
    store = _get_store(db, store_id)
    start = datetime.now(timezone.utc) - timedelta(days=days)

    sold_rows = (
        db.query(
            AnalyticsSales.product_variant_id.label("variant_id"),
            func.sum(AnalyticsSales.quantity).label("units_sold"),
        )
        .filter(
            AnalyticsSales.store_id == store_id,
            AnalyticsSales.created_at >= start,
            AnalyticsSales.product_variant_id.isnot(None),
        )
        .group_by(AnalyticsSales.product_variant_id)
        .all()
    )
    sold_map = {int(r.variant_id): int(r.units_sold or 0) for r in sold_rows}

    eng = get_remote_engine(store)
    q = text("""
        SELECT
            pv.id                           AS variant_id,
            pv.size,
            pv.stock_quantity,
            p.name                          AS product_name,
            p.sku,
            c.category_name
        FROM product_variants pv
        JOIN products p         ON p.id = pv.product_id
        LEFT JOIN categories c  ON c.id = p.category_id
    """)
    try:
        with eng.connect() as conn:
            stock_rows = conn.execute(q).mappings().all()
    finally:
        eng.dispose()

    seen_variants = set()
    result = []
    for sr in stock_rows:
        vid = int(sr["variant_id"])
        sold = sold_map.get(vid, 0)
        on_hand = int(sr["stock_quantity"] or 0)
        seen_variants.add(vid)
        result.append(
            {
                "variant_id": vid,
                "sku": sr["sku"],
                "product_name": sr["product_name"],
                "size": sr["size"],
                "category": sr["category_name"] or "Uncategorised",
                "units_sold": sold,
                "on_hand": on_hand,
                "sell_through_perc": round(sell_through(sold, on_hand), 2),
            }
        )

    for vid, sold in sold_map.items():
        if vid not in seen_variants and sold > 0:
            result.append(
                {
                    "variant_id": vid,
                    "sku": None,
                    "product_name": None,
                    "size": None,
                    "category": "Uncategorised",
                    "units_sold": sold,
                    "on_hand": 0,
                    "sell_through_perc": 100.0,
                }
            )

    result.sort(key=lambda r: r["sell_through_perc"], reverse=True)
    return result


@router.get("/top-products")
def get_top_products(
    store_id: str,
    limit: int = Query(5, ge=1, le=50),
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    _access=Depends(require_store_role()),
):
    start = datetime.now(timezone.utc) - timedelta(days=days)
    rows = (
        db.query(
            AnalyticsSales.product_name,
            func.sum(AnalyticsSales.revenue).label("total_rev"),
            func.sum(AnalyticsSales.quantity).label("total_qty"),
            func.sum(AnalyticsSales.gross_profit).label("total_profit"),
        )
        .filter(
            AnalyticsSales.store_id == store_id,
            AnalyticsSales.created_at >= start,
            AnalyticsSales.product_name.isnot(None),
        )
        .group_by(AnalyticsSales.product_name)
        .order_by(func.sum(AnalyticsSales.revenue).desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "product_name": r.product_name,
            "revenue": float(r.total_rev or 0),
            "units": int(r.total_qty or 0),
            "profit": float(r.total_profit or 0),
        }
        for r in rows
    ]


@router.get("/by-category")
def revenue_by_category(
    store_id: str,
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    _access=Depends(require_store_role()),
):
    start = datetime.now(timezone.utc) - timedelta(days=days)
    rows = (
        db.query(
            AnalyticsSales.category_name,
            func.sum(AnalyticsSales.revenue).label("rev"),
            func.sum(AnalyticsSales.gross_profit).label("profit"),
            func.sum(AnalyticsSales.quantity).label("units"),
        )
        .filter(
            AnalyticsSales.store_id == store_id,
            AnalyticsSales.created_at >= start,
        )
        .group_by(AnalyticsSales.category_name)
        .order_by(func.sum(AnalyticsSales.revenue).desc())
        .all()
    )
    return [
        {
            "category": r.category_name or "Uncategorised",
            "revenue": float(r.rev or 0),
            "profit": float(r.profit or 0),
            "units": int(r.units or 0),
        }
        for r in rows
    ]


@router.get("/discount-impact")
def get_discount_impact(
    store_id: str,
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    _access=Depends(require_store_role("owner")),
):
    start = datetime.now(timezone.utc) - timedelta(days=days)

    discounted_rev_expr = func.sum(
        case(
            (AnalyticsSales.discount_amount > 0, AnalyticsSales.revenue),
            else_=0,
        )
    )
    loss_expr = func.sum(
        AnalyticsSales.retail_price * AnalyticsSales.quantity
        - AnalyticsSales.revenue
    )

    q = db.query(
        func.coalesce(func.sum(AnalyticsSales.revenue), 0).label("total_rev"),
        func.coalesce(discounted_rev_expr, 0).label("disc_rev"),
        func.coalesce(loss_expr, 0).label("loss"),
    ).filter(
        AnalyticsSales.store_id == store_id,
        AnalyticsSales.created_at >= start,
    ).one()

    total_rev = float(q.total_rev or 0)
    disc_rev = float(q.disc_rev or 0)

    return {
        "total_revenue": total_rev,
        "discounted_revenue": disc_rev,
        "discount_share_perc": discount_share(disc_rev, total_rev),
        "markdown_loss": float(q.loss or 0),
    }


@router.get("/discount-impact-timeline", response_model=List[DiscountTimelinePoint])
def get_discount_impact_timeline(
    store_id: str,
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    _access=Depends(require_store_role("owner")),
):
    start = datetime.now(timezone.utc) - timedelta(days=days)

    discounted_rev_expr = func.sum(
        case(
            (AnalyticsSales.discount_amount > 0, AnalyticsSales.revenue),
            else_=0,
        )
    )
    loss_expr = func.sum(
        AnalyticsSales.retail_price * AnalyticsSales.quantity
        - AnalyticsSales.revenue
    )

    rows = (
        db.query(
            func.date(AnalyticsSales.created_at).label("day"),
            func.coalesce(func.sum(AnalyticsSales.revenue), 0).label("total_rev"),
            func.coalesce(discounted_rev_expr, 0).label("disc_rev"),
            func.coalesce(loss_expr, 0).label("loss"),
        )
        .filter(
            AnalyticsSales.store_id == store_id,
            AnalyticsSales.created_at >= start,
        )
        .group_by("day")
        .order_by("day")
        .all()
    )

    return [
        DiscountTimelinePoint(
            date=r.day,
            total_revenue=float(r.total_rev or 0),
            discounted_revenue=float(r.disc_rev or 0),
            markdown_loss=float(r.loss or 0),
            discount_share_perc=discount_share(
                float(r.disc_rev or 0), float(r.total_rev or 0)
            ),
        )
        for r in rows
    ]
