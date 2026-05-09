from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.core.security import verify_firebase_token
from app.db.central.crud import upsert_user, list_stores_for_user, create_store
from app.db.customer.connection import test_connection
from app.schemas.auth import AddStorePayload, LoginResponse, RegisterPayload, StoreRef

router = APIRouter()


@router.post("/login/verify", response_model=LoginResponse)
def login_and_sync_user(
    db: Session = Depends(get_db),
    token_data: dict = Depends(verify_firebase_token),
):
    upsert_user(db, firebase_user=token_data)
    stores = list_stores_for_user(db, user_id=token_data["uid"])
    return LoginResponse(
        status="success",
        user_id=token_data["uid"],
        email=token_data.get("email"),
        stores=[
            StoreRef(store_id=str(s.store_id), name=s.name, role=role)
            for s, role in stores
        ],
    )


@router.post("/register", response_model=LoginResponse)
def register_user(
    payload: RegisterPayload,
    db: Session = Depends(get_db),
    token_data: dict = Depends(verify_firebase_token),
):
    upsert_user(db, firebase_user=token_data)

    if payload.role == "owner" and payload.db_config:
        cfg = payload.db_config
        try:
            test_connection(cfg.host, cfg.port, cfg.user, cfg.password, cfg.db_name)
            store_status = "online"
        except Exception:
            store_status = "offline"
        create_store(db, cfg, owner_id=token_data["uid"], status=store_status)

    stores = list_stores_for_user(db, user_id=token_data["uid"])
    return LoginResponse(
        status="success",
        user_id=token_data["uid"],
        email=token_data.get("email"),
        stores=[
            StoreRef(store_id=str(s.store_id), name=s.name, role=role)
            for s, role in stores
        ],
    )


@router.post("/add-store", response_model=LoginResponse)
def add_store(
    payload: AddStorePayload,
    db: Session = Depends(get_db),
    token_data: dict = Depends(verify_firebase_token),
):
    upsert_user(db, firebase_user=token_data)

    cfg = payload.db_config
    try:
        test_connection(cfg.host, cfg.port, cfg.user, cfg.password, cfg.db_name)
        store_status = "online"
    except Exception:
        store_status = "offline"

    try:
        create_store(db, cfg, owner_id=token_data["uid"], status=store_status)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A store with that database name is already registered.",
        )

    stores = list_stores_for_user(db, user_id=token_data["uid"])
    return LoginResponse(
        status="success",
        user_id=token_data["uid"],
        email=token_data.get("email"),
        stores=[
            StoreRef(store_id=str(s.store_id), name=s.name, role=role)
            for s, role in stores
        ],
    )


@router.get("/me")
def whoami(token_data: dict = Depends(verify_firebase_token)):
    return {
        "uid": token_data.get("uid"),
        "email": token_data.get("email"),
        "name": token_data.get("name"),
    }
