from datetime import date
from typing import List, Optional

from pydantic import BaseModel, Field


class SalesDataPoint(BaseModel):
    date: date
    revenue: float
    profit: float
    volume: int = 0


class BusinessPulseSchema(BaseModel):
    total_revenue: float
    total_profit: float
    avg_margin: float
    total_units_sold: int = 0
    sales_dynamic: List[SalesDataPoint]


class FinancialsSchema(BaseModel):
    revenue: float
    cogs: float
    gross_profit: float
    margin_perc: float
    units_sold: int
    receipts: int
    aov: float
    upt: float
    inventory_turnover: float
    avg_stock_value_used: float


class InventoryCategoryRow(BaseModel):
    category: str
    stock_value: float
    retail_value: float
    units: int


class InventoryValueSchema(BaseModel):
    total_stock_value: float
    total_retail_value: float
    total_units: int
    by_category: List[InventoryCategoryRow]


class DiscountTimelinePoint(BaseModel):
    date: date
    total_revenue: float
    discounted_revenue: float
    markdown_loss: float
    discount_share_perc: float


class SellThroughItemSchema(BaseModel):
    variant_id: int
    sku: Optional[str] = None
    product_name: Optional[str] = None
    size: Optional[str] = None
    category: str = "Uncategorised"
    units_sold: int = 0
    on_hand: int = 0
    sell_through_perc: float = Field(
        ...,
        description="sold / (sold + on_hand) * 100, rounded to 2 decimals.",
    )
