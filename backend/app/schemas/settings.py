from pydantic import BaseModel, Field


class StoreConnectSchema(BaseModel):
    host: str
    port: int = Field(..., ge=1, le=65535)
    db_name: str
    user: str
    password: str
