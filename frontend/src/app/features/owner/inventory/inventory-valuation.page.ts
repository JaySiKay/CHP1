import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { NgxChartsModule, ScaleType } from '@swimlane/ngx-charts';
import { CardComponent } from '../../../shared/ui/card.component';
import { KpiTileComponent } from '../../../shared/ui/kpi-tile.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { StateEmptyComponent } from '../../../shared/ui/state-empty.component';
import { StateErrorComponent } from '../../../shared/ui/state-error.component';
import { StateLoadingComponent } from '../../../shared/ui/state-loading.component';
import {
  formatCurrency,
  formatNumber,
  toErrorMessage,
} from '../../../shared/format';
import { OwnerApi, type InventoryValueResponse } from '../owner.api';

@Component({
  selector: 'app-owner-inventory-valuation',
  standalone: true,
  imports: [
    CardComponent,
    KpiTileComponent,
    PageHeaderComponent,
    StateEmptyComponent,
    StateErrorComponent,
    StateLoadingComponent,
    NgxChartsModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      title="Inventory valuation"
      subtitle="Stock value by category (current on-hand)">
      <button actions type="button" class="btn btn-ghost" (click)="reload()">
        ↻ Refresh
      </button>
    </app-page-header>

    @if (loading()) {
      <div class="space-y-6">
        <app-state-loading variant="kpi-grid" />
        <app-state-loading variant="table" />
      </div>
    } @else if (error()) {
      <app-state-error [message]="error()!" (retry)="reload()" />
    } @else if (!data()) {
      <app-state-empty title="No inventory data." />
    } @else {
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <app-kpi-tile
          title="Stock value (cost)"
          [value]="fmtCurrency(data()!.total_stock_value)" />
        <app-kpi-tile
          title="Retail value"
          [value]="fmtCurrency(data()!.total_retail_value)" />
        <app-kpi-tile
          title="Total units"
          [value]="fmtNumber(data()!.total_units)"
          unit="units" />
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <app-card title="By category — stock value">
          <div class="h-[320px]">
            <ngx-charts-bar-horizontal
              [results]="categoryValueSeries()"
              [scheme]="scheme"
              [xAxis]="true"
              [yAxis]="true"
              [showXAxisLabel]="false">
            </ngx-charts-bar-horizontal>
          </div>
        </app-card>

        <app-card title="By category — detail">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-[var(--color-text-secondary)]">
                <th class="py-2">Category</th>
                <th class="py-2 text-right">Units</th>
                <th class="py-2 text-right">Stock value</th>
                <th class="py-2 text-right">Retail value</th>
              </tr>
            </thead>
            <tbody>
              @for (row of data()!.by_category; track row.category) {
                <tr class="border-t border-[var(--color-border-subtle)]">
                  <td class="py-2">{{ row.category }}</td>
                  <td class="py-2 text-right tabular">{{ fmtNumber(row.units) }}</td>
                  <td class="py-2 text-right tabular">{{ fmtCurrency(row.stock_value) }}</td>
                  <td class="py-2 text-right tabular">{{ fmtCurrency(row.retail_value) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </app-card>
      </div>
    }
  `,
})
export class OwnerInventoryValuationPage {
  private readonly api = inject(OwnerApi);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly data = signal<InventoryValueResponse | null>(null);

  protected readonly fmtCurrency = formatCurrency;
  protected readonly fmtNumber = formatNumber;

  protected readonly scheme = {
    name: 'analytics-hub',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#6366F1', '#475569', '#22C55E', '#F59E0B', '#3B82F6'],
  };

  protected readonly categoryValueSeries = computed(() => {
    const d = this.data();
    if (!d?.by_category?.length) return [];
    return d.by_category.map((c) => ({
      name: c.category,
      value: c.stock_value,
    }));
  });

  constructor() {
    this.reload();
  }

  protected reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getInventoryValue().subscribe({
      next: (resp) => {
        this.data.set(resp);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(toErrorMessage(err, 'Could not load inventory data.'));
        this.loading.set(false);
      },
    });
  }
}
