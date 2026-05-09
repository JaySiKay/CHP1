from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


class InventoryRow(BaseModel):
    product_id: int
    sku: str
    name: str
    category_name: Optional[str] = None
    variant_id: int
    size: str
    stock_quantity: int
    cost_price: Decimal
    retail_price: Decimal
    supplier_name: Optional[str] = None


class SizeAvailabilityRow(BaseModel):
    size: str
    total_stock: int
    variants: int


class DiscountRow(BaseModel):
    name: str
    size: str
    retail_price: Decimal
    avg_sale_price: Decimal
    avg_discount: Decimal
    units_sold: int
