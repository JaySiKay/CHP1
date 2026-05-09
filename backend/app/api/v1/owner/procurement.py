from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.dependencies import get_db, require_store_role
from app.db.central.models import Store
from app.db.customer.connection import get_remote_engine
from app.schemas.procurement import (
    ProcurementOverview,
    SkuProcurementRow,
    SupplierSummaryRow,
)

router = APIRouter()


def _get_store(db: Session, store_id: str) -> Store:
    store = db.query(Store).filter_by(store_id=store_id).first()
    if store is None:
        raise HTTPException(status_code=404, detail="Store not found")
    return store


@router.get("", response_model=List[SkuProcurementRow])
def list_procurement(
    store_id: str,
    supplier: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    _access=Depends(require_store_role("owner")),
):
    store = _get_store(db, store_id)
    eng = get_remote_engine(store)
    q = text("""
        SELECT
            p.id                                    AS product_id,
            p.sku,
            p.name,
            c.category_name                         AS category,
            p.supplier_name                         AS supplier,
            p.cost_price                            AS cost_price,
            p.retail_price                          AS retail_price,
            CASE
                WHEN p.cost_price > 0
                THEN (p.retail_price - p.cost_price) / p.cost_price * 100
                ELSE 0
            END                                     AS markup_perc,
            COALESCE(SUM(pv.stock_quantity), 0)::int           AS units_on_hand,
            COALESCE(SUM(pv.stock_quantity), 0) * p.cost_price AS stock_value_cost
        FROM products p
        LEFT JOIN product_variants pv ON pv.product_id = p.id
        LEFT JOIN categories c         ON c.id = p.category_id
        WHERE (:supplier IS NULL OR p.supplier_name = :supplier)
          AND (:cat      IS NULL OR c.category_name  = :cat)
        GROUP BY p.id, c.category_name
        ORDER BY stock_value_cost DESC
    """)
    try:
        with eng.connect() as conn:
            rows = conn.execute(q, {"supplier": supplier, "cat": category}).mappings().all()
    finally:
        eng.dispose()

    return [
        SkuProcurementRow(
            product_id=int(r["product_id"]),
            sku=r["sku"],
            name=r["name"],
            category=r["category"],
            supplier=r["supplier"],
            cost_price=float(r["cost_price"] or 0),
            retail_price=float(r["retail_price"] or 0),
            markup_perc=float(r["markup_perc"] or 0),
            units_on_hand=int(r["units_on_hand"] or 0),
            stock_value_cost=float(r["stock_value_cost"] or 0),
        )
        for r in rows
    ]


@router.get("/suppliers", response_model=ProcurementOverview)
def supplier_overview(
    store_id: str,
    db: Session = Depends(get_db),
    _access=Depends(require_store_role("owner")),
):
    store = _get_store(db, store_id)
    eng = get_remote_engine(store)
    q = text("""
        SELECT
            COALESCE(p.supplier_name, 'Unknown')               AS supplier,
            COUNT(DISTINCT p.id)::int                          AS products,
            COALESCE(SUM(pv.stock_quantity), 0)::int           AS units_on_hand,
            COALESCE(SUM(pv.stock_quantity * p.cost_price), 0) AS stock_value_cost,
            AVG(p.cost_price)                                   AS avg_cost_price,
            AVG(p.retail_price)                                 AS avg_retail_price
        FROM products p
        LEFT JOIN product_variants pv ON pv.product_id = p.id
        GROUP BY p.supplier_name
        ORDER BY stock_value_cost DESC
    """)
    try:
        with eng.connect() as conn:
            rows = conn.execute(q).mappings().all()
    finally:
        eng.dispose()

    total_value = sum(float(r["stock_value_cost"] or 0) for r in rows) or 0.0
    total_units = sum(int(r["units_on_hand"] or 0) for r in rows)

    by_supplier = [
        SupplierSummaryRow(
            supplier=r["supplier"] or "Unknown",
            products=int(r["products"] or 0),
            units_on_hand=int(r["units_on_hand"] or 0),
            stock_value_cost=float(r["stock_value_cost"] or 0),
            cost_share_perc=(
                float(r["stock_value_cost"] or 0) / total_value * 100
                if total_value
                else 0.0
            ),
            avg_cost_price=float(r["avg_cost_price"] or 0),
            avg_retail_price=float(r["avg_retail_price"] or 0),
        )
        for r in rows
    ]

    return ProcurementOverview(
        total_stock_value_cost=total_value,
        total_units_on_hand=total_units,
        by_supplier=by_supplier,
    )
