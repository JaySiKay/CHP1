from typing import Dict, Iterable, List


def classify_slow_movers(
    products: Iterable[Dict],
    sell_through_threshold: float = 15.0,
) -> List[Dict]:
    return [p for p in products if p.get("sell_through_perc", 0) < sell_through_threshold]


def discount_summary(rows: Iterable[Dict]) -> Dict:
    rows = list(rows)
    total_potential = sum(float(r["retail_price"]) * int(r["quantity"]) for r in rows)
    total_actual = sum(
        float(r["sale_price"]) * int(r["quantity"]) - float(r.get("discount_amount", 0) or 0)
        for r in rows
    )
    total_discount = total_potential - total_actual
    return {
        "potential_revenue": total_potential,
        "actual_revenue": total_actual,
        "markdown_loss": total_discount,
        "discount_share_perc": (total_discount / total_potential * 100)
        if total_potential
        else 0.0,
    }
