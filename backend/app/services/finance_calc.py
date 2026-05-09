from typing import Iterable, Tuple


def calc_revenue(sale_price: float, quantity: int, discount_amount: float = 0.0) -> float:
    return float(sale_price) * int(quantity) - float(discount_amount or 0)


def calc_cogs(cost_price: float, quantity: int) -> float:
    return float(cost_price) * int(quantity)


def calc_gross_profit(revenue: float, cogs: float) -> float:
    return float(revenue) - float(cogs)


def calc_margin(revenue: float, gross_profit: float) -> float:
    revenue = float(revenue)
    return (float(gross_profit) / revenue * 100) if revenue else 0.0


def calc_aov(total_revenue: float, unique_receipts: int) -> float:
    return (float(total_revenue) / unique_receipts) if unique_receipts else 0.0


def calc_upt(total_units: int, unique_receipts: int) -> float:
    return (float(total_units) / unique_receipts) if unique_receipts else 0.0


def discount_share(discounted_revenue: float, total_revenue: float) -> float:
    total_revenue = float(total_revenue)
    return (float(discounted_revenue) / total_revenue * 100) if total_revenue else 0.0


def markdown_impact(rows: Iterable[Tuple[float, float, int]]) -> float:
    return sum(int(q) * (float(retail) - float(actual)) for retail, actual, q in rows)
