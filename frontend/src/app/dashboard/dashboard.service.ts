import { Injectable } from '@angular/core';

export interface Kpi {
  id: string;
  title: string;
  value: string;
  detail?: string;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  async getKpis(): Promise<Kpi[]> {
    return Promise.resolve([
      { id: 'sales', title: 'Sales (30d)', value: '12,430', detail: 'Units: 2,340' },
      { id: 'revenue', title: 'Revenue', value: '$24,200', detail: 'AOV: $19.48' },
      { id: 'low_stock', title: 'Low Stock', value: '18', detail: 'Items below threshold' },
    ]);
  }
}
