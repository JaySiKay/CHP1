import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { catchError, of } from 'rxjs';
import { PeriodStore } from '../../../core/ui/period.store';
import { SettingsApi } from '../../settings/settings.api';
import { KpiTileComponent } from '../../../shared/ui/kpi-tile.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { StateEmptyComponent } from '../../../shared/ui/state-empty.component';
import { StateErrorComponent } from '../../../shared/ui/state-error.component';
import { StateLoadingComponent } from '../../../shared/ui/state-loading.component';
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  toErrorMessage,
} from '../../../shared/format';
import { OwnerApi, type FinancialsResponse } from '../owner.api';

@Component({
  selector: 'app-owner-financials',
  standalone: true,
  imports: [
    KpiTileComponent,
    PageHeaderComponent,
    StateEmptyComponent,
    StateErrorComponent,
    StateLoadingComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      title="Financials"
      [subtitle]="subtitle()">
      <button actions type="button" class="btn btn-ghost"
              [disabled]="syncing() || loading()"
              (click)="refresh()">
        {{ syncing() ? 'Syncing…' : '↻ Refresh' }}
      </button>
    </app-page-header>

    @if (loading()) {
      <app-state-loading variant="kpi-grid" />
    } @else if (error()) {
      <app-state-error [message]="error()!" (retry)="reload()" />
    } @else if (!data()) {
      <app-state-empty title="No financial data for this period." />
    } @else {
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <app-kpi-tile
          title="Revenue"
          [value]="fmtCurrency(data()!.revenue)"
          tooltip="Total sales income: sale price × quantity − discount amount, summed for the period." />
        <app-kpi-tile
          title="COGS"
          [value]="fmtCurrency(data()!.cogs)"
          [inverse]="true"
          tooltip="Cost of Goods Sold — the direct purchase cost of all items sold in this period." />
        <app-kpi-tile
          title="Gross profit"
          [value]="fmtCurrency(data()!.gross_profit)"
          tooltip="Revenue minus COGS — what the store earns after covering product costs." />
        <app-kpi-tile
          title="Margin"
          [value]="fmtPercent(data()!.margin_perc)"
          tooltip="Gross profit as a percentage of revenue: (Gross Profit ÷ Revenue) × 100." />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <app-kpi-tile
          title="AOV"
          [value]="fmtCurrency(data()!.aov)"
          tooltip="Average Order Value — total revenue divided by the number of transactions." />
        <app-kpi-tile
          title="UPT"
          [value]="data()!.upt.toFixed(2)"
          tooltip="Units Per Transaction — average number of items sold per receipt." />
        <app-kpi-tile
          title="Units sold"
          [value]="fmtNumber(data()!.units_sold)"
          unit="units"
          tooltip="Total number of individual units sold across all transactions in the period." />
        <app-kpi-tile
          title="Receipts"
          [value]="fmtNumber(data()!.receipts)"
          tooltip="Total number of distinct sales transactions (receipts) recorded in the period." />
        @if (false) {
        <app-kpi-tile
          title="Inventory turnover"
          [value]="data()!.inventory_turnover.toFixed(2)"
          tooltip="How many times stock was converted into sales: COGS ÷ average on-hand stock value. Higher is better." />
        }
        <app-kpi-tile
          title="Avg stock value"
          [value]="fmtCurrency(data()!.avg_stock_value_used)"
          tooltip="Current on-hand stock valued at purchase (cost) prices, used as a proxy for average stock in the turnover calculation." />
      </div>
    }
  `,
})
export class OwnerFinancialsPage {
  private readonly api = inject(OwnerApi);
  private readonly periodStore = inject(PeriodStore);
  private readonly settingsApi = inject(SettingsApi);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly data = signal<FinancialsResponse | null>(null);
  protected readonly syncing = signal(false);

  protected readonly fmtCurrency = formatCurrency;
  protected readonly fmtNumber = formatNumber;
  protected readonly fmtPercent = formatPercent;

  protected readonly subtitle = computed(() =>
    this.periodStore.period() === 'month' ? 'Last 30 days' : 'Last 7 days',
  );

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
    this.api.getFinancials(days).subscribe({
      next: (resp) => {
        this.data.set(resp);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(toErrorMessage(err, 'Could not load financials.'));
        this.loading.set(false);
      },
    });
  }
}
