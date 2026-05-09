import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment';
import { toHttpParams } from '../../core/api/http-params';
import { AuthStore } from '../../core/auth/auth.store';

export interface StoreProfile {
  store_id: string;
  name: string;
  timezone: string;
  currency: string;
  status: string;
  last_sync_sales: string | null;
  last_sync_returns: string | null;
}

export interface DatabaseConnectRequest {
  host: string;
  port: number;
  db_name: string;
  user: string;
  password: string;
}

export interface DatabaseConnectResponse {
  status: string;
  store_id: string;
}

@Injectable({ providedIn: 'root' })
export class SettingsApi {
  private readonly http = inject(HttpClient);
  private readonly authStore = inject(AuthStore);
  private readonly base = `${environment.apiBaseUrl}/settings`;

  private get storeId(): string {
    return this.authStore.user()?.storeId ?? '';
  }

  getStoreProfile(): Observable<StoreProfile> {
    return this.http.get<StoreProfile>(`${this.base}/store/${this.storeId}`);
  }

  connectDatabase(req: DatabaseConnectRequest): Observable<DatabaseConnectResponse> {
    return this.http.post<DatabaseConnectResponse>(
      `${this.base}/database-connect`,
      req,
    );
  }

  triggerSync(): Observable<unknown> {
    return this.http.post<unknown>(
      `${this.base}/sync`,
      null,
      { params: toHttpParams({ store_id: this.storeId }) },
    );
  }
}
