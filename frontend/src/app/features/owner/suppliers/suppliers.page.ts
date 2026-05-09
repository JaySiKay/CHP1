import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { CardComponent } from '../../../shared/ui/card.component';
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
import { OwnerApi, type ProcurementOverview, type SupplierSummaryRow } from '../owner.api';

@Component({
  selector: 'app-owner-suppliers',
  standalone: true,
  imports: [
    CardComponent,
    KpiTileComponent,
    PageHeaderComponent,
    StateEmptyComponent,
    StateErrorComponent,
    StateLoadingComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      title="Suppliers"
      subtitle="On-hand stock value and cost share by supplier">
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
    } @else if (!overview()) {
      <app-state-empty title="No supplier data available." />
    } @else {
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <app-kpi-tile
          title="Total stock value (cost)"
          [value]="fmtCurrency(overview()!.total_stock_value_cost)" />
        <app-kpi-tile
          title="Total units on hand"
          [value]="fmtNumber(overview()!.total_units_on_hand)"
          unit="units" />
      </div>

      @if (!allSuppliers().length) {
        <app-state-empty title="No supplier activity." />
      } @else {
        <app-card>
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-[var(--color-text-secondary)]">
                <th class="py-2">Supplier</th>
                <th class="py-2 text-right">SKUs</th>
                <th class="py-2 text-right">Units on hand</th>
                <th class="py-2 text-right">Stock value</th>
                <th class="py-2 text-right">Cost share</th>
                <th class="py-2 text-right">Avg cost</th>
                <th class="py-2 text-right">Avg retail</th>
              </tr>
            </thead>
            <tbody>
              @for (s of pagedSuppliers(); track s.supplier) {
                <tr class="border-t border-[var(--color-border-subtle)]">
                  <td class="py-2 font-medium">{{ s.supplier }}</td>
                  <td class="py-2 text-right tabular">{{ fmtNumber(s.products) }}</td>
                  <td class="py-2 text-right tabular">{{ fmtNumber(s.units_on_hand) }}</td>
                  <td class="py-2 text-right tabular">{{ fmtCurrency(s.stock_value_cost) }}</td>
                  <td class="py-2 text-right tabular">{{ fmtPercent(s.cost_share_perc) }}</td>
                  <td class="py-2 text-right tabular">{{ fmtCurrency(s.avg_cost_price, 2) }}</td>
                  <td class="py-2 text-right tabular">{{ fmtCurrency(s.avg_retail_price, 2) }}</td>
                </tr>
              }
            </tbody>
          </table>
          @if (totalPages() > 1) {
            <div class="flex items-center justify-between mt-4 pt-3 border-t border-[var(--color-border-subtle)]">
              <button type="button" class="btn btn-ghost h-8 px-3 text-xs"
                      [disabled]="page() === 1" (click)="prevPage()">← Previous</button>
              <span class="text-xs text-[var(--color-text-secondary)]">
                Page {{ page() }} of {{ totalPages() }}
              </span>
              <button type="button" class="btn btn-ghost h-8 px-3 text-xs"
                      [disabled]="page() === totalPages()" (click)="nextPage()">Next →</button>
            </div>
          }
        </app-card>
      }
    }
  `,
})
export class OwnerSuppliersPage implements OnInit {
  private readonly api = inject(OwnerApi);

  private readonly PAGE_SIZE = 15;

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly overview = signal<ProcurementOverview | null>(null);
  protected readonly allSuppliers = signal<SupplierSummaryRow[]>([]);
  protected readonly page = signal(1);

  protected readonly pagedSuppliers = computed(() => {
    const start = (this.page() - 1) * this.PAGE_SIZE;
    return this.allSuppliers().slice(start, start + this.PAGE_SIZE);
  });

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.allSuppliers().length / this.PAGE_SIZE))
  );

  protected readonly fmtCurrency = formatCurrency;
  protected readonly fmtNumber = formatNumber;
  protected readonly fmtPercent = formatPercent;

  ngOnInit(): void {
    this.reload();
  }

  protected prevPage(): void { this.page.update(p => p - 1); }
  protected nextPage(): void { this.page.update(p => p + 1); }

  protected reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getSupplierOverview().subscribe({
      next: (resp) => {
        this.overview.set(resp);
        this.allSuppliers.set(resp.by_supplier);
        this.page.set(1);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(toErrorMessage(err, 'Could not load suppliers.'));
        this.loading.set(false);
      },
    });
  }
}
