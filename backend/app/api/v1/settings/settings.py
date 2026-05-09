from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_db, require_store_role
from app.db.central import crud
from app.db.central.models import Store
from app.db.customer.connection import test_connection
from app.etl.extract import sync_one_store
from app.schemas.settings import StoreConnectSchema


router = APIRouter()


@router.post("/database-connect")
def connect_store_database(
    config: StoreConnectSchema,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        test_connection(
            config.host, config.port, config.user, config.password, config.db_name
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Connection failed: {e}")

    crud.upsert_user(db, firebase_user=current_user)

    existing = crud.get_owner_store(db, user_id=current_user["uid"])
    if existing:
        crud.update_store_credentials(db, store=existing, config=config)
        return {"status": "success", "store_id": str(existing.store_id)}

    new_store = crud.create_store(db, config, owner_id=current_user["uid"])
    return {"status": "success", "store_id": str(new_store.store_id)}


@router.get("/store/{store_id}")
def get_store_profile(
    store_id: str,
    db: Session = Depends(get_db),
    _access=Depends(require_store_role()),
):
    store = db.query(Store).filter_by(store_id=store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    return {
        "store_id": str(store.store_id),
        "name": store.name,
        "timezone": store.timezone,
        "currency": store.currency,
        "status": store.status,
        "last_sync_sales": store.last_sync_sales,
        "last_sync_returns": store.last_sync_returns,
    }


@router.post("/sync")
def trigger_sync(
    store_id: str,
    db: Session = Depends(get_db),
    _access=Depends(require_store_role()),
):
    store = db.query(Store).filter_by(store_id=store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    try:
        summary = sync_one_store(db, store)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Sync failed: {e}",
        )
    return summary
