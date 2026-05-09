import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CardComponent } from '../../../shared/ui/card.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { StateEmptyComponent } from '../../../shared/ui/state-empty.component';
import { StateErrorComponent } from '../../../shared/ui/state-error.component';
import { StateLoadingComponent } from '../../../shared/ui/state-loading.component';
import { formatNumber, toErrorMessage } from '../../../shared/format';
import { AdminApi, type InventoryRow } from '../admin.api';

@Component({
  selector: 'app-admin-low-stock',
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
      title="Low stock"
      subtitle="Variants at or below the stock threshold">
      <label actions class="flex items-center gap-2 text-sm
                          text-[var(--color-text-secondary)]">
        Threshold
        <input type="number"
               class="input w-20"
               min="0" max="9999"
               [ngModel]="threshold()"
               (ngModelChange)="onThresholdChange($event)" />
        units
      </label>
      <button actions type="button" class="btn btn-ghost" (click)="reload()">
        ↻ Refresh
      </button>
    </app-page-header>

    @if (loading()) {
      <app-state-loading variant="table" />
    } @else if (error()) {
      <app-state-error [message]="error()!" (retry)="reload()" />
    } @else if (!allItems().length) {
      <app-state-empty
        title="Stock levels look healthy."
        description="No variants are at or below the threshold." />
    } @else {
      <app-card>
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-[var(--color-text-secondary)]">
              <th class="py-2">Category</th>
              <th class="py-2">Product</th>
              <th class="py-2">Size</th>
              <th class="py-2 text-right">Stock</th>
            </tr>
          </thead>
          <tbody>
            @for (item of pagedItems(); track item.variant_id) {
              <tr class="border-t border-[var(--color-border-subtle)]">
                <td class="py-2 text-[var(--color-text-secondary)]">
                  {{ item.category_name ?? '—' }}
                </td>
                <td class="py-2 font-medium">{{ item.name }}</td>
                <td class="py-2">{{ item.size }}</td>
                <td class="py-2 text-right">
                  <span class="chip"
                        [class]="item.stock_quantity === 0 ? 'chip-danger' : 'chip-warning'">
                    {{ fmtNumber(item.stock_quantity) }}
                  </span>
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
      </app-card>
    }
  `,
})
export class AdminLowStockPage implements OnInit {
  private readonly api = inject(AdminApi);

  private readonly PAGE_SIZE = 15;

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly allItems = signal<InventoryRow[]>([]);
  protected readonly threshold = signal<number>(5);
  protected readonly page = signal(1);

  protected readonly pagedItems = computed(() => {
    const start = (this.page() - 1) * this.PAGE_SIZE;
    return this.allItems().slice(start, start + this.PAGE_SIZE);
  });

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.allItems().length / this.PAGE_SIZE))
  );

  protected readonly fmtNumber = formatNumber;

  private debounce: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.reload();
  }

  protected prevPage(): void { this.page.update(p => p - 1); }
  protected nextPage(): void { this.page.update(p => p + 1); }

  protected onThresholdChange(v: number): void {
    if (!Number.isFinite(v)) return;
    this.threshold.set(Math.max(0, Math.round(v)));
    if (this.debounce) clearTimeout(this.debounce);
    this.debounce = setTimeout(() => this.reload(), 300);
  }

  protected reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getInventory({ low_stock_only: true, threshold: this.threshold() }).subscribe({
      next: (rows) => {
        this.allItems.set(rows);
        this.page.set(1);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(toErrorMessage(err, 'Could not load low stock.'));
        this.loading.set(false);
      },
    });
  }
}
