from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.dependencies import get_db, require_store_role
from app.db.central.models import Store
from app.db.customer.connection import get_remote_engine
from app.schemas.returns import ReturnRow

router = APIRouter()


def _get_store(db: Session, store_id: str) -> Store:
    store = db.query(Store).filter_by(store_id=store_id).first()
    if store is None:
        raise Exception(f"Store {store_id} not registered")
    return store


@router.get("/returns", response_model=List[ReturnRow])
def list_returns(
    store_id: str,
    days: Optional[int] = Query(None, ge=1, le=365),
    db: Session = Depends(get_db),
    _access=Depends(require_store_role()),
):
    store = _get_store(db, store_id)
    eng = get_remote_engine(store)
    q = text("""
        SELECT r.id,
               r.created_at,
               p.name              AS product_name,
               pv.size,
               r.reason,
               r.return_quantity,
               r.refund_amount
        FROM returns r
        JOIN sales s             ON s.id   = r.sale_id
        JOIN product_variants pv ON pv.id  = s.product_variant_id
        JOIN products p          ON p.id   = pv.product_id
        WHERE (:days IS NULL
               OR r.created_at > NOW() - (:days || ' days')::interval)
        ORDER BY r.created_at ASC
    """)
    try:
        with eng.connect() as conn:
            rows = conn.execute(q, {"days": days}).mappings().all()
    finally:
        eng.dispose()
    return [ReturnRow(**dict(r)) for r in rows]
