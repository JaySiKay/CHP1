from datetime import datetime, timedelta, timezone
from typing import Dict

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.central.models import Store
from app.db.central.mv import refresh_mv_daily_sales
from app.db.customer.connection import get_remote_engine
from app.etl.transform import process_and_load

MAX_FAILURES_BEFORE_OFFLINE = 3
VERIFICATION_WINDOW_HOURS = 24


def extract_new_data(db_central: Session) -> None:
    for store in db_central.query(Store).all():
        try:
            sync_one_store(db_central, store, refresh_mv=False)
        except Exception:
            pass
    refresh_mv_daily_sales(db_central)


def sync_one_store(
    db_central: Session,
    store: Store,
    refresh_mv: bool = True,
) -> Dict[str, object]:
    try:
        summary = _extract_one_store(db_central, store)
        store.consecutive_failures = 0
        store.status = "online"
        db_central.commit()
        if refresh_mv:
            refresh_mv_daily_sales(db_central)
        return {"status": "ok", **summary}
    except Exception as e:

        db_central.rollback()
        store.consecutive_failures = (store.consecutive_failures or 0) + 1
        if store.consecutive_failures >= MAX_FAILURES_BEFORE_OFFLINE:
            store.status = "offline"
        db_central.commit()
        print(f"[ETL] Store {store.name} failed "
              f"({store.consecutive_failures}x): {e}")
        raise


def _extract_one_store(db_central: Session, store: Store) -> Dict[str, object]:
    extract_started = datetime.now(timezone.utc)
    engine = get_remote_engine(store)
    try:
        with engine.connect() as conn:
            sales_q = text("""
                SELECT id, transaction_id, product_variant_id, quantity,
                       sale_price, discount_amount, is_cancelled, created_at
                FROM sales
                WHERE created_at > :last_sync
                  AND is_cancelled = FALSE
            """)
            new_sales = conn.execute(
                sales_q, {"last_sync": store.last_sync_sales}
            ).mappings().all()

            returns_since = max(
                store.last_sync_returns,
                datetime.now(timezone.utc) - timedelta(hours=VERIFICATION_WINDOW_HOURS),
            )
            returns_q = text("""
                SELECT id, sale_id, reason, return_quantity, refund_amount, created_at
                FROM returns
                WHERE created_at > :since
            """)
            new_returns = conn.execute(
                returns_q, {"since": returns_since}
            ).mappings().all()

            if new_sales or new_returns:
                process_and_load(
                    db_central=db_central,
                    store_id=store.store_id,
                    raw_sales=list(new_sales),
                    raw_returns=list(new_returns),
                    remote_conn=conn,
                )

            store.last_sync_sales = extract_started
            store.last_sync_returns = extract_started
    finally:
        engine.dispose()

    return {
        "sales": len(new_sales),
        "returns": len(new_returns),
        "synced_at": extract_started.isoformat(),
    }
