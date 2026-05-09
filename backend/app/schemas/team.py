from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field


Role = Literal["owner", "admin"]


class TeamGrantRequest(BaseModel):
    email: EmailStr
    role: Role = "admin"


class TeamMemberSchema(BaseModel):
    user_id: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: Role
    granted_at: Optional[datetime] = None


class TeamGrantResponse(BaseModel):
    status: str = Field(default="success")
    user_id: str
    email: Optional[str] = None
    role: Role


class AccessLogEntry(BaseModel):
    id: str
    created_at: datetime
    actor_user_id: Optional[str] = None
    actor_email: Optional[str] = None
    target_user_id: Optional[str] = None
    target_email: Optional[str] = None
    action: Literal["grant", "revoke", "role_change"]
    role: Optional[Role] = None
