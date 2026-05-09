import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CardComponent } from '../../../shared/ui/card.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { StateEmptyComponent } from '../../../shared/ui/state-empty.component';
import { StateErrorComponent } from '../../../shared/ui/state-error.component';
import { StateLoadingComponent } from '../../../shared/ui/state-loading.component';
import { formatCurrency, formatNumber, toErrorMessage } from '../../../shared/format';
import { AdminApi, type InventoryRow } from '../admin.api';
import { AuthStore } from '../../../core/auth/auth.store';

@Component({
  selector: 'app-admin-inventory',
  standalone: true,
  imports: [
    CardComponent,
    PageHeaderComponent,
    StateEmptyComponent,
    StateErrorComponent,
    StateLoadingComponent,
    FormsModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      title="Inventory"
      subtitle="Live stock per variant">
      <input
        actions
        type="text"
        class="input w-48"
        placeholder="Filter by category"
        [ngModel]="category()"
        (ngModelChange)="onCategoryChange($event)" />
      <label actions class="flex items-center gap-2 text-sm
                          text-[var(--color-text-secondary)]">
        <input type="checkbox"
               [checked]="lowStockOnly()"
               (change)="onLowStockToggle($any($event.target).checked)" />
        Low stock only
      </label>
      <button actions type="button" class="btn btn-ghost" (click)="reload()">
        ↻ Refresh
      </button>
    </app-page-header>

    @if (loading()) {
      <app-state-loading variant="table" />
    } @else if (error()) {
      <app-state-error [message]="error()!" (retry)="reload()" />
    } @else if (!allRows().length) {
      <app-state-empty title="No products match these filters." />
    } @else {
      <app-card>
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-[var(--color-text-secondary)]">
              <th class="py-2">Category</th>
              <th class="py-2">Product</th>
              <th class="py-2">SKU</th>
              <th class="py-2">Size</th>
              <th class="py-2 text-right">Stock</th>
              @if (isOwner()) {
                <th class="py-2 text-right">Cost</th>
              }
              <th class="py-2 text-right">Retail</th>
            </tr>
          </thead>
          <tbody>
            @for (row of pagedRows(); track row.variant_id) {
              <tr class="border-t border-[var(--color-border-subtle)]">
                <td class="py-2 text-[var(--color-text-secondary)]">
                  {{ row.category_name ?? '—' }}
                </td>
                <td class="py-2">
                  <div class="font-medium">{{ row.name }}</div>
                  @if (row.supplier_name) {
                    <div class="text-xs text-[var(--color-text-secondary)]">
                      {{ row.supplier_name }}
                    </div>
                  }
                </td>
                <td class="py-2 text-[var(--color-text-secondary)] text-xs tabular">
                  {{ row.sku }}
                </td>
                <td class="py-2">{{ row.size }}</td>
                <td class="py-2 text-right tabular">
                  <span [class]="row.stock_quantity === 0 ? 'chip chip-danger'
                                : row.stock_quantity < 5 ? 'chip chip-warning'
                                : ''">
                    {{ fmtNumber(row.stock_quantity) }}
                  </span>
                </td>
                @if (isOwner()) {
                  <td class="py-2 text-right tabular">{{ fmtCurrency(row.cost_price, 2) }}</td>
                }
                <td class="py-2 text-right tabular">{{ fmtCurrency(row.retail_price, 2) }}</td>
              </tr>
            }
          </tbody>
        </table>
        <div class="mt-3 text-xs text-[var(--color-text-secondary)]">
          {{ fmtNumber(allRows().length) }} variant{{ allRows().length === 1 ? '' : 's' }}
        </div>
        @if (totalPages() > 1) {
          <div class="flex items-center justify-between mt-3 pt-3 border-t border-[var(--color-border-subtle)]">
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
export class AdminInventoryPage {
  private readonly api = inject(AdminApi);
  private readonly authStore = inject(AuthStore);

  protected readonly isOwner = this.authStore.isOwner;

  private readonly PAGE_SIZE = 15;

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly allRows = signal<InventoryRow[]>([]);
  protected readonly page = signal(1);

  protected readonly pagedRows = computed(() => {
    const start = (this.page() - 1) * this.PAGE_SIZE;
    return this.allRows().slice(start, start + this.PAGE_SIZE);
  });

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.allRows().length / this.PAGE_SIZE))
  );

  protected readonly category = signal<string>('');
  protected readonly lowStockOnly = signal<boolean>(false);

  protected readonly fmtCurrency = formatCurrency;
  protected readonly fmtNumber = formatNumber;

  private categoryDebounce: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      this.lowStockOnly();
      this.reload();
    });
  }

  protected prevPage(): void { this.page.update(p => p - 1); }
  protected nextPage(): void { this.page.update(p => p + 1); }

  protected onCategoryChange(value: string): void {
    this.category.set(value);
    if (this.categoryDebounce) clearTimeout(this.categoryDebounce);
    this.categoryDebounce = setTimeout(() => this.reload(), 250);
  }

  protected onLowStockToggle(v: boolean): void {
    this.lowStockOnly.set(v);
  }

  protected reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .getInventory({
        category: this.category() || undefined,
        low_stock_only: this.lowStockOnly() || undefined,
      })
      .subscribe({
        next: (rows) => {
          this.allRows.set(rows);
          this.page.set(1);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(toErrorMessage(err, 'Could not load inventory.'));
          this.loading.set(false);
        },
      });
  }
}
