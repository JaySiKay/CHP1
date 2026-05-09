import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { catchError, of } from 'rxjs';
import { NgxChartsModule, ScaleType } from '@swimlane/ngx-charts';
import { AuthStore } from '../../core/auth/auth.store';
import { PeriodStore } from '../../core/ui/period.store';
import { CardComponent } from '../../shared/ui/card.component';
import { KpiTileComponent } from '../../shared/ui/kpi-tile.component';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { StateEmptyComponent } from '../../shared/ui/state-empty.component';
import { StateErrorComponent } from '../../shared/ui/state-error.component';
import { StateLoadingComponent } from '../../shared/ui/state-loading.component';
import { formatCurrency, formatPercent, toErrorMessage } from '../../shared/format';
import { SettingsApi } from '../settings/settings.api';
import {
  BusinessPulseApi,
  type BusinessPulseResponse,
} from './business-pulse.api';

@Component({
  selector: 'app-business-pulse',
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
      [title]="'Business Pulse'"
      [subtitle]="subtitle()">
      <button actions type="button" class="btn btn-ghost"
              [disabled]="syncing() || loading()"
              (click)="refresh()">
        {{ syncing() ? 'Syncing…' : '↻ Refresh' }}
      </button>
    </app-page-header>

    @if (loading()) {
      <div class="space-y-6">
        <app-state-loading variant="kpi-grid" />
        <app-state-loading variant="chart" />
      </div>
    } @else if (error()) {
      <app-state-error
        [message]="error()!"
        (retry)="reload()" />
    } @else if (!data()) {
      <app-state-empty
        title="No pulse data yet"
        description="Once your store starts syncing data, your KPIs will appear here." />
    } @else {
      @if (authStore.isAdmin()) {
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <app-kpi-tile
            title="Total revenue"
            [value]="fmtCurrency(data()!.total_revenue)"
            tooltip="Sum of all sales revenue in the selected period." />
          <app-kpi-tile
            title="Total sold"
            [value]="data()!.total_units_sold + ' units'"
            tooltip="Total number of units sold across all transactions in the selected period." />
        </div>

        <app-card
          title="Revenue &amp; Units Sold"
          [subtitle]="subtitle()"
          tooltip="Daily revenue and units sold plotted together. Shows how sales volume correlates with income over the selected period.">
          <div class="h-[320px]">
            <ngx-charts-line-chart
              [results]="adminChartSeries()"
              [scheme]="adminChartScheme"
              [xAxis]="true"
              [yAxis]="true"
              [showXAxisLabel]="false"
              [showYAxisLabel]="false"
              [legend]="true"
              [autoScale]="true"
              [animations]="true">
            </ngx-charts-line-chart>
          </div>
        </app-card>
      } @else {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <app-kpi-tile
            title="Total revenue"
            [value]="fmtCurrency(data()!.total_revenue)"
            tooltip="Sum of all sales revenue in the selected period." />
          <app-kpi-tile
            title="Total profit"
            [value]="fmtCurrency(data()!.total_profit)"
            tooltip="Revenue minus cost of goods sold (COGS) — what remains after covering product costs." />
          <app-kpi-tile
            title="Avg margin"
            [value]="fmtPercent(data()!.avg_margin)"
            tooltip="Gross profit as a percentage of revenue: (Profit ÷ Revenue) × 100." />
        </div>

        <app-card
          title="Revenue &amp; profit"
          [subtitle]="subtitle()"
          tooltip="Daily revenue and gross profit plotted over the selected period. The gap between lines shows your cost of goods sold.">
          <div class="h-[320px]">
            <ngx-charts-line-chart
              [results]="ownerChartSeries()"
              [scheme]="ownerChartScheme"
              [xAxis]="true"
              [yAxis]="true"
              [showXAxisLabel]="false"
              [showYAxisLabel]="false"
              [legend]="true"
              [autoScale]="true"
              [animations]="true">
            </ngx-charts-line-chart>
          </div>
        </app-card>
      }
    }
  `,
})
export class BusinessPulsePage {
  private readonly api = inject(BusinessPulseApi);
  private readonly periodStore = inject(PeriodStore);
  private readonly settingsApi = inject(SettingsApi);
  protected readonly authStore = inject(AuthStore);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly data = signal<BusinessPulseResponse | null>(null);
  protected readonly syncing = signal(false);

  protected readonly fmtCurrency = formatCurrency;
  protected readonly fmtPercent = formatPercent;

  protected readonly ownerChartScheme = {
    name: 'analytics-hub-owner',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#6366F1', '#22C55E'],
  };

  protected readonly adminChartScheme = {
    name: 'analytics-hub-admin',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#6366F1', '#F59E0B'],
  };

  protected readonly subtitle = computed(() =>
    this.periodStore.period() === 'month' ? 'Last 30 days' : 'Last 7 days',
  );

  protected readonly ownerChartSeries = computed(() => {
    const d = this.data();
    if (!d?.sales_dynamic?.length) return [];
    return [
      {
        name: 'Revenue',
        series: d.sales_dynamic.map((p) => ({ name: String(p.date), value: p.revenue })),
      },
      {
        name: 'Profit',
        series: d.sales_dynamic.map((p) => ({ name: String(p.date), value: p.profit })),
      },
    ];
  });

  protected readonly adminChartSeries = computed(() => {
    const d = this.data();
    if (!d?.sales_dynamic?.length) return [];
    return [
      {
        name: 'Revenue',
        series: d.sales_dynamic.map((p) => ({ name: String(p.date), value: p.revenue })),
      },
      {
        name: 'Units Sold',
        series: d.sales_dynamic.map((p) => ({ name: String(p.date), value: p.volume })),
      },
    ];
  });

  constructor() {
    effect(() => {
      this.periodStore.period();
      untracked(() => this.reload());
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
    this.api.get(this.periodStore.period()).subscribe({
      next: (resp) => {
        this.data.set(resp);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(toErrorMessage(err, 'Could not load Business Pulse.'));
        this.loading.set(false);
      },
    });
  }
}
