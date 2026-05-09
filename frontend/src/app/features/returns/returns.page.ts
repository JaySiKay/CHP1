import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { catchError, of } from 'rxjs';
import { CardComponent } from '../../shared/ui/card.component';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { StateEmptyComponent } from '../../shared/ui/state-empty.component';
import { StateErrorComponent } from '../../shared/ui/state-error.component';
import { StateLoadingComponent } from '../../shared/ui/state-loading.component';
import { formatCurrency, formatDate, toErrorMessage } from '../../shared/format';
import { SettingsApi } from '../settings/settings.api';
import { ReturnsApi, type ReturnRow } from './returns.api';

type FilterPeriod = 'week' | 'month' | 'all';

@Component({
  selector: 'app-returns',
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
      title="Returns"
      [subtitle]="subtitle()">
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
    } @else {
      <app-card>
        <div class="flex items-center gap-2 mb-5">
          @for (opt of filterOptions; track opt.value) {
            <button type="button"
                    class="h-7 px-3 text-xs rounded-[var(--radius-sm)] border transition-colors"
                    [class]="filter() === opt.value
                      ? 'bg-[var(--color-brand-500)] text-white border-[var(--color-brand-500)]'
                      : 'border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:border-[var(--color-brand-500)] hover:text-[var(--color-text-primary)]'"
                    (click)="filter.set(opt.value)">
              {{ opt.label }}
            </button>
          }
          <span class="ml-auto text-xs text-[var(--color-text-secondary)]">
            {{ count() }} {{ count() === 1 ? 'return' : 'returns' }}
          </span>
        </div>

        @if (count() === 0) {
          <app-state-empty
            title="No returns in this period."
            description="Try a wider date window." />
        } @else {
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-[var(--color-text-secondary)]">
                <th class="py-2 font-medium">Date</th>
                <th class="py-2 font-medium">Product</th>
                <th class="py-2 font-medium">Size</th>
                <th class="py-2 font-medium">Reason</th>
                <th class="py-2 font-medium text-right">Qty</th>
                <th class="py-2 font-medium text-right">Refund</th>
              </tr>
            </thead>
            <tbody>
              @for (r of pagedRows(); track r.id) {
                <tr class="border-t border-[var(--color-border-subtle)]">
                  <td class="py-2 text-[var(--color-text-secondary)]">
                    {{ fmtDate(r.created_at) }}
                  </td>
                  <td class="py-2 font-medium">{{ r.product_name }}</td>
                  <td class="py-2">{{ r.size }}</td>
                  <td class="py-2 text-[var(--color-text-secondary)]">
                    {{ r.reason ?? '—' }}
                  </td>
                  <td class="py-2 text-right tabular">{{ r.return_quantity }}</td>
                  <td class="py-2 text-right tabular">
                    {{ '' + fmtCurrency(r.refund_amount, 2) }}
                  </td>
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
        }
      </app-card>
    }
  `,
})
export class ReturnsPage {
  private readonly api = inject(ReturnsApi);
  private readonly settingsApi = inject(SettingsApi);

  private readonly PAGE_SIZE = 15;

  protected readonly filter = signal<FilterPeriod>('week');
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly allRows = signal<ReturnRow[]>([]);
  protected readonly syncing = signal(false);
  protected readonly page = signal(1);

  protected readonly filterOptions: { label: string; value: FilterPeriod }[] = [
    { label: 'Week', value: 'week' },
    { label: 'Month', value: 'month' },
    { label: 'All', value: 'all' },
  ];

  protected readonly subtitle = computed(() => {
    const f = this.filter();
    if (f === 'week') return 'Last 7 days · oldest first';
    if (f === 'month') return 'Last 30 days · oldest first';
    return 'All time · oldest first';
  });

  protected readonly count = computed(() => this.allRows().length);

  protected readonly pagedRows = computed(() => {
    const start = (this.page() - 1) * this.PAGE_SIZE;
    return this.allRows().slice(start, start + this.PAGE_SIZE);
  });

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.allRows().length / this.PAGE_SIZE))
  );

  protected readonly fmtDate = formatDate;
  protected readonly fmtCurrency = formatCurrency;

  constructor() {
    effect(() => {
      this.filter();
      this.reload();
    });
  }

  protected prevPage(): void { this.page.update(p => p - 1); }
  protected nextPage(): void { this.page.update(p => p + 1); }

  protected reload(): void {
    this.loading.set(true);
    this.error.set(null);
    const f = this.filter();
    const days = f === 'week' ? 7 : f === 'month' ? 30 : undefined;
    this.api.getReturns(days).subscribe({
      next: (rows) => {
        this.allRows.set(rows);
        this.page.set(1);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(toErrorMessage(err, 'Could not load returns.'));
        this.loading.set(false);
      },
    });
  }

  protected refresh(): void {
    this.syncing.set(true);
    this.settingsApi.triggerSync().pipe(catchError(() => of(null))).subscribe(() => {
      this.syncing.set(false);
      this.reload();
    });
  }
}
