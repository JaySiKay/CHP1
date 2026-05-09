from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_db, require_store_role
from app.db.central import crud
from app.db.central.models import AccessLog, User, UserStoreAccess
from app.schemas.team import (
    AccessLogEntry,
    TeamGrantRequest,
    TeamGrantResponse,
    TeamMemberSchema,
)

router = APIRouter()


def _write_audit(
    db: Session,
    *,
    store_id,
    actor: dict,
    target: User,
    action: str,
    role: str | None,
) -> None:
    db.add(
        AccessLog(
            store_id=store_id,
            actor_user_id=actor.get("uid"),
            actor_email=actor.get("email"),
            target_user_id=target.user_id,
            target_email=target.email,
            action=action,
            role=role,
        )
    )


def _count_owners(db: Session, store_id) -> int:
    return (
        db.query(func.count(UserStoreAccess.id))
        .filter(
            UserStoreAccess.store_id == store_id,
            UserStoreAccess.role == "owner",
        )
        .scalar()
    ) or 0


@router.get("", response_model=List[TeamMemberSchema])
def list_team(
    store_id: str,
    db: Session = Depends(get_db),
    _access=Depends(require_store_role("owner")),
):
    rows = crud.list_store_team(db, store_id=store_id)
    members = [
        TeamMemberSchema(
            user_id=u.user_id,
            email=u.email,
            full_name=u.full_name,
            role=role,
            granted_at=granted_at,
        )
        for u, role, granted_at in rows
    ]
    members.sort(key=lambda m: (0 if m.role == "owner" else 1, (m.email or "").lower()))
    return members


@router.post(
    "",
    response_model=TeamGrantResponse,
    status_code=status.HTTP_201_CREATED,
)
def grant_access(
    payload: TeamGrantRequest,
    store_id: str,
    db: Session = Depends(get_db),
    actor: dict = Depends(get_current_user),
    _access=Depends(require_store_role("owner")),
):
    target = db.query(User).filter(User.email == str(payload.email)).first()
    if target is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No such user — they need to sign in through Firebase first.",
        )

    if target.user_id == actor.get("uid"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You can't change your own role here.",
        )

    existing = (
        db.query(UserStoreAccess)
        .filter(
            UserStoreAccess.user_id == target.user_id,
            UserStoreAccess.store_id == store_id,
        )
        .first()
    )
    action = "role_change" if existing else "grant"

    crud.grant_access(db, user_id=target.user_id, store_id=store_id, role=payload.role)
    _write_audit(
        db,
        store_id=store_id,
        actor=actor,
        target=target,
        action=action,
        role=payload.role,
    )
    db.commit()

    return TeamGrantResponse(
        status="success",
        user_id=target.user_id,
        email=target.email,
        role=payload.role,
    )


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_access(
    user_id: str,
    store_id: str = Query(...),
    db: Session = Depends(get_db),
    actor: dict = Depends(get_current_user),
    _access=Depends(require_store_role("owner")),
):
    if user_id == actor.get("uid"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You can't revoke your own access.",
        )

    existing = (
        db.query(UserStoreAccess)
        .filter(
            UserStoreAccess.user_id == user_id,
            UserStoreAccess.store_id == store_id,
        )
        .first()
    )
    if existing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This user has no access to the store.",
        )

    if existing.role == "owner" and _count_owners(db, store_id) <= 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can't revoke the last owner of the store.",
        )

    target = db.query(User).filter(User.user_id == user_id).first()

    db.query(UserStoreAccess).filter(
        UserStoreAccess.user_id == user_id,
        UserStoreAccess.store_id == store_id,
    ).delete()

    if target is not None:
        _write_audit(
            db,
            store_id=store_id,
            actor=actor,
            target=target,
            action="revoke",
            role=None,
        )
    db.commit()

    return


@router.get("/audit", response_model=List[AccessLogEntry])
def recent_actions(
    store_id: str,
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
    _access=Depends(require_store_role("owner")),
):
    rows = (
        db.query(AccessLog)
        .filter(AccessLog.store_id == store_id)
        .order_by(AccessLog.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        AccessLogEntry(
            id=str(r.id),
            created_at=r.created_at,
            actor_user_id=r.actor_user_id,
            actor_email=r.actor_email,
            target_user_id=r.target_user_id,
            target_email=r.target_email,
            action=r.action,
            role=r.role,
        )
        for r in rows
    ]
