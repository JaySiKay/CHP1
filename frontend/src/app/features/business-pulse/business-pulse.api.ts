import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { environment } from '../../../environment';
import { toHttpParams } from '../../core/api/http-params';
import { AuthStore } from '../../core/auth/auth.store';

export type Trend = 'up' | 'down' | 'flat';

export interface PulseWidget {
  value: number;
  change_percent: number;
  trend: Trend;
  unit?: string;
}

export interface OwnerChartPoint {
  date: string;
  revenue: number;
  profit: number;
}

export interface AdminChartPoint {
  date: string;
  volume: number;
}

export type ChartPoint = OwnerChartPoint | AdminChartPoint;

export interface BusinessPulseResponse {
  total_revenue: number;
  total_profit: number;
  avg_margin: number;
  total_units_sold: number;
  sales_dynamic: Array<{
    date: string;
    revenue: number;
    profit: number;
    volume: number;
  }>;
}

@Injectable({ providedIn: 'root' })
export class BusinessPulseApi {
  private readonly http = inject(HttpClient);
  private readonly authStore = inject(AuthStore);
  private readonly url = `${environment.apiBaseUrl}/analytics/pulse`;

  get(period: 'week' | 'month'): Observable<BusinessPulseResponse> {
    const storeId = this.authStore.user()?.storeId;

    if (!storeId) {
      return throwError(() => new Error('No store selected. Please select a store to view the dashboard.'));
    }

    const days = period === 'week' ? 7 : 30;

    return this.http.get<BusinessPulseResponse>(this.url, {
      params: toHttpParams({
        store_id: storeId,
        days: days,
      }),
    });
  }
}
