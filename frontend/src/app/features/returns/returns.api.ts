import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment';
import { toHttpParams } from '../../core/api/http-params';
import { AuthStore } from '../../core/auth/auth.store';

export interface ReturnRow {
  id: number;
  created_at: string;
  product_name: string;
  size: string;
  reason: string | null;
  return_quantity: number;
  refund_amount: number;
}

@Injectable({ providedIn: 'root' })
export class ReturnsApi {
  private readonly http = inject(HttpClient);
  private readonly authStore = inject(AuthStore);
  private readonly base = `${environment.apiBaseUrl}/admin`;

  private get storeId(): string {
    return this.authStore.user()?.storeId ?? '';
  }

  getReturns(days?: number): Observable<ReturnRow[]> {
    return this.http.get<ReturnRow[]>(`${this.base}/returns`, {
      params: toHttpParams({ store_id: this.storeId, days: days ?? null }),
    });
  }
}
