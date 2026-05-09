from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.dependencies import get_db, require_store_role
from app.db.central.models import Store
from app.db.customer.connection import get_remote_engine
from app.schemas.inventory import DiscountRow, InventoryRow, SizeAvailabilityRow

router = APIRouter()


def _get_store(db: Session, store_id: str) -> Store:
    store = db.query(Store).filter_by(store_id=store_id).first()
    if store is None:
        raise Exception(f"Store {store_id} not registered")
    return store


@router.get("/inventory", response_model=List[InventoryRow])
def list_inventory(
    store_id: str,
    category: Optional[str] = None,
    low_stock_only: bool = False,
    threshold: int = Query(5, ge=0),
    db: Session = Depends(get_db),
    _access=Depends(require_store_role()),
):
    store = _get_store(db, store_id)
    eng = get_remote_engine(store)
    q = text("""
        SELECT p.id              AS product_id,
               p.sku,
               p.name,
               c.category_name,
               pv.id             AS variant_id,
               pv.size,
               pv.stock_quantity,
               p.cost_price,
               p.retail_price,
               p.supplier_name
        FROM product_variants pv
        JOIN products p       ON p.id = pv.product_id
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE (:cat IS NULL OR c.category_name = :cat)
          AND (:low = FALSE OR pv.stock_quantity <= :th)
        ORDER BY p.name, pv.size
    """)
    try:
        with eng.connect() as conn:
            rows = conn.execute(
                q, {"cat": category, "low": low_stock_only, "th": threshold}
            ).mappings().all()
    finally:
        eng.dispose()
    return [InventoryRow(**dict(r)) for r in rows]


@router.get("/sizes", response_model=List[SizeAvailabilityRow])
def popular_sizes_availability(
    store_id: str,
    db: Session = Depends(get_db),
    _access=Depends(require_store_role()),
):
    store = _get_store(db, store_id)
    eng = get_remote_engine(store)
    q = text("""
        SELECT pv.size,
               SUM(pv.stock_quantity)::int AS total_stock,
               COUNT(*)::int               AS variants
        FROM product_variants pv
        WHERE pv.size IN ('S','M','L')
        GROUP BY pv.size
        ORDER BY pv.size
    """)
    try:
        with eng.connect() as conn:
            rows = conn.execute(q).mappings().all()
    finally:
        eng.dispose()
    return [SizeAvailabilityRow(**dict(r)) for r in rows]


@router.get("/discounts", response_model=List[DiscountRow])
def active_discounts(
    store_id: str,
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    _access=Depends(require_store_role()),
):
    store = _get_store(db, store_id)
    eng = get_remote_engine(store)
    q = text("""
        SELECT p.name,
               pv.size,
               p.retail_price,
               AVG(s.sale_price - s.discount_amount) AS avg_sale_price,
               AVG(s.discount_amount)                AS avg_discount,
               SUM(s.quantity)::int                  AS units_sold
        FROM sales s
        JOIN product_variants pv ON pv.id = s.product_variant_id
        JOIN products p          ON p.id  = pv.product_id
        WHERE s.discount_amount > 0
          AND s.is_cancelled = FALSE
          AND s.created_at > NOW() - (:days || ' days')::interval
        GROUP BY p.name, pv.size, p.retail_price
        ORDER BY units_sold DESC
    """)
    try:
        with eng.connect() as conn:
            rows = conn.execute(q, {"days": days}).mappings().all()
    finally:
        eng.dispose()
    return [DiscountRow(**dict(r)) for r in rows]
