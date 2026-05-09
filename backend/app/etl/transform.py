from sqlalchemy import text

from app.etl.load import apply_returns, bulk_upsert_sales
from app.services.finance_calc import (
    calc_cogs,
    calc_gross_profit,
    calc_margin,
    calc_revenue,
)


def get_products_cache(remote_conn) -> dict:
    q = text("""
        SELECT pv.id AS variant_id,
               p.id  AS product_id,
               p.name AS product_name,
               p.cost_price,
               p.retail_price,
               c.id  AS category_id,
               c.category_name,
               pv.size
        FROM product_variants pv
        JOIN products p   ON p.id = pv.product_id
        LEFT JOIN categories c ON c.id = p.category_id
    """)
    rows = remote_conn.execute(q).mappings().all()
    return {r["variant_id"]: dict(r) for r in rows}


def _is_dirty(sale: dict) -> bool:
    if sale.get("sale_price") is None or float(sale["sale_price"]) < 0:
        return True
    if sale.get("quantity") is None or int(sale["quantity"]) <= 0:
        return True
    if sale.get("created_at") is None:
        return True
    return False


def process_and_load(db_central, store_id, raw_sales, raw_returns, remote_conn) -> None:
    cache = get_products_cache(remote_conn) if raw_sales else {}

    enriched = []
    for s in raw_sales:
        if _is_dirty(s):
            continue
        meta = cache.get(s["product_variant_id"], {})
        revenue = calc_revenue(
            s["sale_price"], s["quantity"], s.get("discount_amount") or 0
        )
        cogs = calc_cogs(meta.get("cost_price") or 0, s["quantity"])
        profit = calc_gross_profit(revenue, cogs)
        margin = calc_margin(revenue, profit)
        enriched.append(
            dict(
                store_id=store_id,
                sale_id_remote=s["id"],
                transaction_id=s["transaction_id"],
                product_variant_id=s["product_variant_id"],
                product_name=meta.get("product_name"),
                category_id=meta.get("category_id"),
                category_name=meta.get("category_name"),
                size=meta.get("size"),
                revenue=revenue,
                cogs=cogs,
                gross_profit=profit,
                margin_perc=margin,
                quantity=s["quantity"],
                discount_amount=float(s.get("discount_amount") or 0),
                retail_price=float(meta.get("retail_price") or 0),
                created_at=s["created_at"],
            )
        )

    if enriched:
        bulk_upsert_sales(db_central, enriched)
    if raw_returns:
        apply_returns(db_central, store_id, raw_returns)

    db_central.commit()
