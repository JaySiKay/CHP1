import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { catchError, of } from 'rxjs';
import { CardComponent } from '../../../shared/ui/card.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { StateEmptyComponent } from '../../../shared/ui/state-empty.component';
import { StateErrorComponent } from '../../../shared/ui/state-error.component';
import { StateLoadingComponent } from '../../../shared/ui/state-loading.component';
import { formatCurrency, formatNumber, toErrorMessage } from '../../../shared/format';
import { SettingsApi } from '../../settings/settings.api';
import { AdminApi, type DiscountRow } from '../admin.api';

@Component({
  selector: 'app-admin-discounts',
  standalone: true,
  imports: [
    CardComponent,
    PageHeaderComponent,
    StateEmptyComponent,
    StateErrorComponent,
    StateLoadingComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      title="Discounts"
      subtitle="Items sold at a discount in the last 30 days">
      <button actions type="button" class="btn btn-ghost"
              [disabled]="syncing() || loading()"
              (click)="refresh()">
        {{ syncing() ? 'Syncing…' : '↻ Refresh' }}
      </button>
    </app-page-header>

    @if (loading()) {
      <app-state-loading variant="table" />
    } @else if (error()) {
      <app-state-error [message]="error()!" (retry)="reload()" />
    } @else if (!allDiscounts().length) {
      <app-state-empty title="No active discounts." />
    } @else {
      <app-card>
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-[var(--color-text-secondary)]">
              <th class="py-2">Product</th>
              <th class="py-2">Size</th>
              <th class="py-2 text-right">Retail</th>
              <th class="py-2 text-right">Avg sale</th>
              <th class="py-2 text-right">Avg discount</th>
              <th class="py-2 text-right">Units sold</th>
            </tr>
          </thead>
          <tbody>
            @for (d of pagedDiscounts(); track d.name + d.size) {
              <tr class="border-t border-[var(--color-border-subtle)]">
                <td class="py-2 font-medium">{{ d.name }}</td>
                <td class="py-2">{{ d.size }}</td>
                <td class="py-2 text-right tabular">{{ fmtCurrency(d.retail_price, 2) }}</td>
                <td class="py-2 text-right tabular text-[var(--color-brand-700)]">
                  {{ fmtCurrency(d.avg_sale_price, 2) }}
                </td>
                <td class="py-2 text-right">
                  <span class="chip chip-info">−{{ fmtCurrency(d.avg_discount, 2) }}</span>
                </td>
                <td class="py-2 text-right tabular">{{ fmtNumber(d.units_sold) }}</td>
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
  `,
})
export class AdminDiscountsPage implements OnInit {
  private readonly api = inject(AdminApi);
  private readonly settingsApi = inject(SettingsApi);

  private readonly PAGE_SIZE = 15;

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly allDiscounts = signal<DiscountRow[]>([]);
  protected readonly syncing = signal(false);
  protected readonly page = signal(1);

  protected readonly pagedDiscounts = computed(() => {
    const start = (this.page() - 1) * this.PAGE_SIZE;
    return this.allDiscounts().slice(start, start + this.PAGE_SIZE);
  });

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.allDiscounts().length / this.PAGE_SIZE))
  );

  protected readonly fmtCurrency = formatCurrency;
  protected readonly fmtNumber = formatNumber;

  ngOnInit(): void {
    this.reload();
  }

  protected prevPage(): void { this.page.update(p => p - 1); }
  protected nextPage(): void { this.page.update(p => p + 1); }

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
    this.api.getDiscounts().subscribe({
      next: (rows) => {
        this.allDiscounts.set(rows);
        this.page.set(1);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(toErrorMessage(err, 'Could not load discounts.'));
        this.loading.set(false);
      },
    });
  }
}
