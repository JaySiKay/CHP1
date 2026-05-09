from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.orm import Session


MV_NAME = "mv_daily_sales_by_store"


def refresh_mv_daily_sales(db: Session) -> bool:
    try:
        db.execute(text(f"REFRESH MATERIALIZED VIEW CONCURRENTLY {MV_NAME}"))
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        print(f"[MV] refresh {MV_NAME} skipped: {e}")
        return False
