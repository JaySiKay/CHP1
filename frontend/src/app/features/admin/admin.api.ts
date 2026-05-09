import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment';
import { toHttpParams } from '../../core/api/http-params';
import { AuthStore } from '../../core/auth/auth.store';

export interface InventoryRow {
  product_id: number;
  sku: string;
  name: string;
  category_name: string | null;
  variant_id: number;
  size: string;
  stock_quantity: number;
  cost_price: number;
  retail_price: number;
  supplier_name: string | null;
}

export interface SizeAvailabilityRow {
  size: string;
  total_stock: number;
  variants: number;
}

export interface InventoryQuery {
  category?: string;
  low_stock_only?: boolean;
  threshold?: number;
}

export interface DiscountRow {
  name: string;
  size: string;
  retail_price: number;
  avg_sale_price: number;
  avg_discount: number;
  units_sold: number;
}

export interface CategoryRevenueRow {
  category: string;
  revenue: number;
  profit: number;
  units: number;
}

export interface TopProductRow {
  product_name: string;
  revenue: number;
  units: number;
  profit: number;
}

@Injectable({ providedIn: 'root' })
export class AdminApi {
  private readonly http = inject(HttpClient);
  private readonly authStore = inject(AuthStore);
  private readonly adminBase = `${environment.apiBaseUrl}/admin`;
  private readonly analyticsBase = `${environment.apiBaseUrl}/analytics`;

  private get storeId(): string {
    return this.authStore.user()?.storeId ?? '';
  }

  getInventory(query: InventoryQuery = {}): Observable<InventoryRow[]> {
    return this.http.get<InventoryRow[]>(`${this.adminBase}/inventory`, {
      params: toHttpParams({
        store_id: this.storeId,
        category: query.category ?? null,
        low_stock_only: query.low_stock_only ?? null,
        threshold: query.threshold ?? null,
      }),
    });
  }

  getSizes(): Observable<SizeAvailabilityRow[]> {
    return this.http.get<SizeAvailabilityRow[]>(`${this.adminBase}/sizes`, {
      params: toHttpParams({ store_id: this.storeId }),
    });
  }

  getDiscounts(days?: number): Observable<DiscountRow[]> {
    return this.http.get<DiscountRow[]>(`${this.adminBase}/discounts`, {
      params: toHttpParams({ store_id: this.storeId, days: days ?? null }),
    });
  }

  getByCategory(days?: number): Observable<CategoryRevenueRow[]> {
    return this.http.get<CategoryRevenueRow[]>(`${this.analyticsBase}/by-category`, {
      params: toHttpParams({ store_id: this.storeId, days: days ?? null }),
    });
  }

  getTopProducts(limit?: number, days?: number): Observable<TopProductRow[]> {
    return this.http.get<TopProductRow[]>(`${this.analyticsBase}/top-products`, {
      params: toHttpParams({
        store_id: this.storeId,
        limit: limit ?? null,
        days: days ?? null,
      }),
    });
  }
}
