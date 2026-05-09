from typing import List, Tuple

from sqlalchemy import func
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from .models import Store, User, UserStoreAccess


def upsert_user(db: Session, firebase_user: dict) -> None:
    full_name = firebase_user.get("name") or firebase_user["email"].split("@")[0]
    stmt = (
        insert(User)
        .values(
            user_id=firebase_user["uid"],
            email=firebase_user["email"],
            full_name=full_name,
            last_login=func.now(),
        )
        .on_conflict_do_update(
            index_elements=["user_id"],
            set_={
                "last_login": func.now(),
                "email": firebase_user["email"],
                "full_name": full_name,
            },
        )
    )
    db.execute(stmt)
    db.commit()


def get_user(db: Session, user_id: str) -> User | None:
    return db.query(User).filter_by(user_id=user_id).first()


def create_store(db: Session, config, owner_id: str, status: str = "online") -> Store:
    new_store = Store(
        name=config.db_name,
        db_host=config.host,
        db_port=str(config.port),
        db_user=config.user,
        db_password=config.password,
        db_name=config.db_name,
        timezone="UTC",
        currency="USD",
        status=status,
    )
    db.add(new_store)
    db.flush()
    grant_access(db, user_id=owner_id, store_id=new_store.store_id, role="owner")
    db.commit()
    db.refresh(new_store)
    return new_store


def get_owner_store(db: Session, user_id: str) -> Store | None:
    row = (
        db.query(UserStoreAccess)
        .filter_by(user_id=user_id, role="owner")
        .first()
    )
    if row is None:
        return None
    return db.query(Store).filter_by(store_id=row.store_id).first()


def update_store_credentials(db: Session, store: Store, config) -> None:
    store.db_host = config.host
    store.db_port = str(config.port)
    store.db_user = config.user
    store.db_password = config.password
    store.db_name = config.db_name
    store.name = config.db_name
    store.status = "online"
    store.consecutive_failures = 0
    db.commit()


def grant_access(db: Session, user_id: str, store_id, role: str) -> None:
    stmt = (
        insert(UserStoreAccess)
        .values(user_id=user_id, store_id=store_id, role=role)
        .on_conflict_do_update(
            index_elements=["user_id", "store_id"],
            set_={"role": role},
        )
    )
    db.execute(stmt)


def revoke_access(db: Session, user_id: str, store_id) -> None:
    db.query(UserStoreAccess).filter_by(user_id=user_id, store_id=store_id).delete()
    db.commit()


def list_stores_for_user(db: Session, user_id: str) -> List[Tuple[Store, str]]:
    return (
        db.query(Store, UserStoreAccess.role)
        .join(UserStoreAccess, UserStoreAccess.store_id == Store.store_id)
        .filter(UserStoreAccess.user_id == user_id)
        .all()
    )


def list_store_team(db: Session, store_id) -> List[Tuple[User, str, object]]:
    return (
        db.query(User, UserStoreAccess.role, UserStoreAccess.granted_at)
        .join(UserStoreAccess, UserStoreAccess.user_id == User.user_id)
        .filter(UserStoreAccess.store_id == store_id)
        .all()
    )
