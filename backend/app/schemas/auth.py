from typing import List, Optional

from pydantic import BaseModel, Field


class StoreRef(BaseModel):
    store_id: str
    name: str
    role: str


class LoginResponse(BaseModel):
    status: str
    user_id: str
    email: Optional[str] = None
    stores: List[StoreRef] = []


class UserProfile(BaseModel):
    user_id: str
    email: str
    full_name: Optional[str] = None
    role: str


class DbConfig(BaseModel):
    host: str
    port: int = Field(..., ge=1, le=65535)
    db_name: str
    user: str
    password: str


class RegisterPayload(BaseModel):
    role: str
    db_config: Optional[DbConfig] = None


class AddStorePayload(BaseModel):
    db_config: DbConfig
