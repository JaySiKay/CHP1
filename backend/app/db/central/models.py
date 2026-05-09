import uuid

import sqlalchemy as sa
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

Base = declarative_base()
UserRole = sa.Enum("owner", "admin", name="user_role")


class User(Base):
    __tablename__ = "users"

    user_id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    full_name = Column(String, nullable=True)
    is_active = Column(Boolean, server_default="true")
    role = Column(UserRole, server_default="owner")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True))

    stores = relationship("UserStoreAccess", back_populates="user")


class Store(Base):
    __tablename__ = "stores"

    store_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(Text, nullable=False)
    db_host = Column(Text, nullable=False)
    db_port = Column(Text, nullable=False)
    db_user = Column(Text, nullable=False)
    db_password = Column(Text, nullable=False)
    db_name = Column(Text, nullable=False, unique=True)
    timezone = Column(Text, default="UTC")
    currency = Column(Text, default="USD")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_sync_sales = Column(DateTime(timezone=True), server_default=func.now())
    last_sync_returns = Column(DateTime(timezone=True), server_default=func.now())

    consecutive_failures = Column(Integer, server_default="0")
    status = Column(String, server_default="online")


class UserStoreAccess(Base):
    __tablename__ = "user_store_access"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Text, ForeignKey("users.user_id", ondelete="CASCADE"))
    store_id = Column(UUID(as_uuid=True), ForeignKey("stores.store_id", ondelete="CASCADE"))
    role = Column(UserRole, nullable=False)
    granted_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint("user_id", "store_id", name="uq_user_store"),)

    user = relationship("User", back_populates="stores")


class AnalyticsSales(Base):
    __tablename__ = "analytics_sales"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    store_id = Column(UUID(as_uuid=True), ForeignKey("stores.store_id"))
    sale_id_remote = Column(Integer)
    transaction_id = Column(Text)

    product_variant_id = Column(Integer)
    product_name = Column(Text)
    category_id = Column(Integer)
    category_name = Column(Text)
    size = Column(Text)

    revenue = Column(Numeric(10, 2))
    cogs = Column(Numeric(10, 2))
    gross_profit = Column(Numeric(10, 2))
    margin_perc = Column(Numeric(5, 2))
    discount_amount = Column(Numeric(10, 2))
    retail_price = Column(Numeric(10, 2))

    quantity = Column(Integer)
    created_at = Column(DateTime(timezone=True))

    __table_args__ = (
        UniqueConstraint("store_id", "sale_id_remote", name="uq_analytics_store_sale"),
        Index("ix_analytics_store_created", "store_id", "created_at"),
    )


class DirtyDataLog(Base):
    __tablename__ = "dirty_data_log"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    store_id = Column(UUID(as_uuid=True), ForeignKey("stores.store_id"))
    source_table = Column(Text)
    source_id = Column(Integer)
    reason = Column(Text)
    payload = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AccessLog(Base):
    __tablename__ = "access_log"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    store_id = Column(UUID(as_uuid=True), ForeignKey("stores.store_id"))
    actor_user_id = Column(Text)
    actor_email = Column(Text)
    target_user_id = Column(Text)
    target_email = Column(Text)
    action = Column(Text)
    role = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_access_log_store_created", "store_id", "created_at"),
    )
