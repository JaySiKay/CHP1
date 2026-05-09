from typing import Iterable, Tuple


def stock_value(inventory: Iterable[Tuple[int, float]]) -> float:
    return sum(int(q) * float(c) for q, c in inventory)


def sell_through(units_sold: int, current_stock: int) -> float:
    total = int(units_sold) + int(current_stock)
    return (int(units_sold) / total * 100) if total else 0.0


def inventory_turnover(cogs: float, avg_stock_value: float) -> float:
    avg_stock_value = float(avg_stock_value)
    return (float(cogs) / avg_stock_value) if avg_stock_value else 0.0
