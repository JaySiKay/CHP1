import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment';
import { toHttpParams } from '../../core/api/http-params';
import { AuthStore } from '../../core/auth/auth.store';

export interface FinancialsResponse {
  revenue: number;
  cogs: number;
  gross_profit: number;
  margin_perc: number;
  units_sold: number;
  receipts: number;
  aov: number;
  upt: number;
  inventory_turnover: number;
  avg_stock_value_used: number;
}

export interface InventoryCategoryRow {
  category: string;
  stock_value: number;
  retail_value: number;
  units: number;
}

export interface InventoryValueResponse {
  total_stock_value: number;
  total_retail_value: number;
  total_units: number;
  by_category: InventoryCategoryRow[];
}

export interface TeamMember {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: 'owner' | 'admin';
  granted_at: string | null;
}

export interface TeamGrantResponse {
  status: string;
  user_id: string;
  email?: string | null;
  role: 'owner' | 'admin';
}

export interface InviteTeamMember {
  email: string;
  role: 'owner' | 'admin';
}

export interface SkuProcurementRow {
  product_id: number;
  sku: string;
  name: string;
  category: string | null;
  supplier: string | null;
  cost_price: number;
  retail_price: number;
  markup_perc: number;
  units_on_hand: number;
  stock_value_cost: number;
}

export interface SupplierSummaryRow {
  supplier: string;
  products: number;
  units_on_hand: number;
  stock_value_cost: number;
  cost_share_perc: number;
  avg_cost_price: number;
  avg_retail_price: number;
}

export interface ProcurementOverview {
  total_stock_value_cost: number;
  total_units_on_hand: number;
  by_supplier: SupplierSummaryRow[];
}

@Injectable({ providedIn: 'root' })
export class OwnerApi {
  private readonly http = inject(HttpClient);
  private readonly authStore = inject(AuthStore);
  private readonly analyticsBase = `${environment.apiBaseUrl}/analytics`;
  private readonly ownerBase = `${environment.apiBaseUrl}/owner`;

  private get storeId(): string {
    return this.authStore.user()?.storeId ?? '';
  }

  getFinancials(days = 30): Observable<FinancialsResponse> {
    return this.http.get<FinancialsResponse>(`${this.analyticsBase}/financials`, {
      params: toHttpParams({ store_id: this.storeId, days }),
    });
  }

  getInventoryValue(category?: string): Observable<InventoryValueResponse> {
    return this.http.get<InventoryValueResponse>(`${this.analyticsBase}/inventory-value`, {
      params: toHttpParams({ store_id: this.storeId, category: category ?? null }),
    });
  }

  listTeam(): Observable<TeamMember[]> {
    return this.http.get<TeamMember[]>(`${this.ownerBase}/team`, {
      params: toHttpParams({ store_id: this.storeId }),
    });
  }

  inviteTeamMember(payload: InviteTeamMember): Observable<TeamGrantResponse> {
    return this.http.post<TeamGrantResponse>(
      `${this.ownerBase}/team`,
      payload,
      { params: toHttpParams({ store_id: this.storeId }) },
    );
  }

  revokeTeamMember(userId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.ownerBase}/team/${userId}`,
      { params: toHttpParams({ store_id: this.storeId }) },
    );
  }

  listProcurement(supplier?: string, category?: string): Observable<SkuProcurementRow[]> {
    return this.http.get<SkuProcurementRow[]>(`${this.ownerBase}/procurement`, {
      params: toHttpParams({
        store_id: this.storeId,
        supplier: supplier ?? null,
        category: category ?? null,
      }),
    });
  }

  getSupplierOverview(): Observable<ProcurementOverview> {
    return this.http.get<ProcurementOverview>(`${this.ownerBase}/procurement/suppliers`, {
      params: toHttpParams({ store_id: this.storeId }),
    });
  }
}
