from decimal import Decimal
from typing import List

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.db.central.models import AnalyticsSales

UPSERT_BATCH_SIZE = 5000


def _upsert_chunk(db: Session, rows: List[dict]) -> None:
    stmt = insert(AnalyticsSales).values(rows)
    stmt = stmt.on_conflict_do_update(
        index_elements=["store_id", "sale_id_remote"],
        set_={
            "revenue": stmt.excluded.revenue,
            "cogs": stmt.excluded.cogs,
            "gross_profit": stmt.excluded.gross_profit,
            "margin_perc": stmt.excluded.margin_perc,
            "quantity": stmt.excluded.quantity,
            "discount_amount": stmt.excluded.discount_amount,
            "retail_price": stmt.excluded.retail_price,
            "product_name": stmt.excluded.product_name,
            "category_id": stmt.excluded.category_id,
            "category_name": stmt.excluded.category_name,
            "size": stmt.excluded.size,
            "transaction_id": stmt.excluded.transaction_id,
        },
    )
    db.execute(stmt)


def bulk_upsert_sales(db: Session, rows: List[dict]) -> None:
    if not rows:
        return
    for i in range(0, len(rows), UPSERT_BATCH_SIZE):
        _upsert_chunk(db, rows[i : i + UPSERT_BATCH_SIZE])


def apply_returns(db: Session, store_id, raw_returns: List[dict]) -> None:
    for r in raw_returns:
        row = (
            db.query(AnalyticsSales)
            .filter(
                AnalyticsSales.store_id == store_id,
                AnalyticsSales.sale_id_remote == r["sale_id"],
            )
            .first()
        )
        if row is None:
            continue

        orig_qty = int(row.quantity or 0)
        ret_qty = int(r["return_quantity"] or 0)
        if orig_qty <= 0 or ret_qty <= 0:
            continue

        factor = Decimal(str(min(ret_qty, orig_qty))) / Decimal(str(orig_qty))
        remain = Decimal("1") - factor

        row.revenue = (row.revenue or Decimal(0)) * remain
        row.cogs = (row.cogs or Decimal(0)) * remain
        row.gross_profit = (row.revenue or Decimal(0)) - (row.cogs or Decimal(0))
        rev = row.revenue or Decimal(0)
        row.margin_perc = (row.gross_profit / rev * Decimal(100)) if rev else Decimal(0)
        row.quantity = max(orig_qty - ret_qty, 0)
