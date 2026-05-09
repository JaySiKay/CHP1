import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';
import { NgxChartsModule, ScaleType } from '@swimlane/ngx-charts';
import { PeriodStore } from '../../../core/ui/period.store';
import { CardComponent } from '../../../shared/ui/card.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { StateEmptyComponent } from '../../../shared/ui/state-empty.component';
import { StateErrorComponent } from '../../../shared/ui/state-error.component';
import { StateLoadingComponent } from '../../../shared/ui/state-loading.component';
import { formatCurrency, formatNumber, toErrorMessage } from '../../../shared/format';
import { SettingsApi } from '../../settings/settings.api';
import {
  AdminApi,
  type CategoryRevenueRow,
  type TopProductRow,
} from '../../admin/admin.api';

interface SalesViewModel {
  topProducts: TopProductRow[];
  byCategory: CategoryRevenueRow[];
}

@Component({
  selector: 'app-owner-sales',
  standalone: true,
  imports: [
    CardComponent,
    PageHeaderComponent,
    StateEmptyComponent,
    StateErrorComponent,
    StateLoadingComponent,
    NgxChartsModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      title="Sales"
      [subtitle]="subtitle()">
      <button actions type="button" class="btn btn-ghost"
              [disabled]="syncing() || loading()"
              (click)="refresh()">
        {{ syncing() ? 'Syncing…' : '↻ Refresh' }}
      </button>
    </app-page-header>

    @if (loading()) {
      <div class="space-y-6">
        <app-state-loading variant="chart" />
        <app-state-loading variant="chart" />
      </div>
    } @else if (error()) {
      <app-state-error [message]="error()!" (retry)="reload()" />
    } @else if (!data()) {
      <app-state-empty title="No sales for this period." />
    } @else {
      <div class="space-y-6">
        <app-card
          title="Top products"
          subtitle="By revenue"
          tooltip="The top 10 products ranked by revenue earned in the selected period.">
          <div class="h-[280px]">
            <ngx-charts-bar-horizontal
              [results]="topProductSeries()"
              [scheme]="primaryScheme"
              [xAxis]="true"
              [yAxis]="true"
              [showXAxisLabel]="false"
              [showYAxisLabel]="false">
            </ngx-charts-bar-horizontal>
          </div>
        </app-card>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <app-card
            title="By category"
            tooltip="Distribution of units sold across product categories in the selected period.">
            <div class="h-[280px]">
              <ngx-charts-pie-chart
                [results]="categorySeries()"
                [scheme]="multiScheme"
                [doughnut]="true"
                [legend]="true">
              </ngx-charts-pie-chart>
            </div>
          </app-card>

          <app-card
            title="By category — detail"
            tooltip="Revenue and unit breakdown per product category. Revenue = sale price × quantity − discounts.">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-[var(--color-text-secondary)]">
                  <th class="py-2">Category</th>
                  <th class="py-2 text-right">Units</th>
                  <th class="py-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                @for (row of data()!.byCategory; track row.category) {
                  <tr class="border-t border-[var(--color-border-subtle)]">
                    <td class="py-2 font-medium">{{ row.category }}</td>
                    <td class="py-2 text-right tabular">{{ fmtNumber(row.units) }}</td>
                    <td class="py-2 text-right tabular">{{ fmtCurrency(row.revenue) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </app-card>
        </div>
      </div>
    }
  `,
})
export class OwnerSalesPage {
  private readonly api = inject(AdminApi);
  private readonly periodStore = inject(PeriodStore);
  private readonly settingsApi = inject(SettingsApi);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly data = signal<SalesViewModel | null>(null);
  protected readonly syncing = signal(false);

  protected readonly fmtNumber = formatNumber;
  protected readonly fmtCurrency = formatCurrency;

  protected readonly primaryScheme = {
    name: 'analytics-hub',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#6366F1'],
  };

  protected readonly multiScheme = {
    name: 'analytics-hub',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#6366F1', '#475569', '#22C55E', '#F59E0B', '#3B82F6', '#EF4444'],
  };

  protected readonly subtitle = computed(() =>
    this.periodStore.period() === 'month' ? 'Last 30 days' : 'Last 7 days',
  );

  protected readonly topProductSeries = computed(() => {
    const d = this.data()?.topProducts;
    if (!d) return [];
    return d.map((p) => ({ name: p.product_name, value: p.revenue }));
  });

  protected readonly categorySeries = computed(() => {
    const c = this.data()?.byCategory;
    if (!c) return [];
    return c.map((row) => ({ name: row.category, value: row.units }));
  });

  constructor() {
    effect(() => {
      this.periodStore.period();
      this.reload();
    });
  }

  protected refresh(): void {
    this.syncing.set(true);
    this.settingsApi.triggerSync().pipe(catchError(() => of(null))).subscribe(() => {
      this.syncing.set(false);
      this.reload();
    });
  }

  protected reload(): void {
    this.loading.set(true);
    this.error.set(null);
    const days = this.periodStore.period() === 'month' ? 30 : 7;

    forkJoin({
      topProducts: this.api.getTopProducts(10, days),
      byCategory: this.api.getByCategory(days),
    }).subscribe({
      next: ({ topProducts, byCategory }) => {
        this.data.set({ topProducts, byCategory });
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(toErrorMessage(err, 'Could not load sales.'));
        this.loading.set(false);
      },
    });
  }
}
