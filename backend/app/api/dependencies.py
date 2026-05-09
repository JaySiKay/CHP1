from typing import Generator, Optional

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import verify_firebase_token
from app.db.central.session import SessionLocal
from app.db.central.models import UserStoreAccess


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(token_data: dict = Depends(verify_firebase_token)) -> dict:
    return token_data


def require_store_role(required: Optional[str] = None):
    def _dep(
        store_id: str,
        user: dict = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> UserStoreAccess:
        row = (
            db.query(UserStoreAccess)
            .filter(
                UserStoreAccess.user_id == user["uid"],
                UserStoreAccess.store_id == store_id,
            )
            .first()
        )
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No access to this store",
            )
        if required is not None and row.role != required:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{required}' required",
            )
        return row

    return _dep
