from typing import List, Optional

from pydantic import BaseModel


class SkuProcurementRow(BaseModel):
    product_id: int
    sku: str
    name: str
    category: Optional[str] = None
    supplier: Optional[str] = None
    cost_price: float
    retail_price: float
    markup_perc: float
    units_on_hand: int
    stock_value_cost: float


class SupplierSummaryRow(BaseModel):
    supplier: str
    products: int
    units_on_hand: int
    stock_value_cost: float
    cost_share_perc: float
    avg_cost_price: float
    avg_retail_price: float


class ProcurementOverview(BaseModel):
    total_stock_value_cost: float
    total_units_on_hand: int
    by_supplier: List[SupplierSummaryRow]
