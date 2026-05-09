from app.db.central.session import SessionLocal
from app.etl.extract import extract_new_data


def run_etl_sync_task() -> None:
    db = SessionLocal()
    try:
        extract_new_data(db)
    finally:
        db.close()
