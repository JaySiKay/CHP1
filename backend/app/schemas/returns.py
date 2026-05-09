from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


class ReturnRow(BaseModel):
    id: int
    created_at: datetime
    product_name: str
    size: str
    reason: Optional[str] = None
    return_quantity: int
    refund_amount: Decimal
