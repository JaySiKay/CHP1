import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TrendIndicatorComponent, type Trend } from './trend-indicator.component';

@Component({
  selector: 'app-kpi-tile',
  standalone: true,
  imports: [TrendIndicatorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.title]': 'null' },
  template: `
    <article class="surface surface-hover p-5" [attr.aria-label]="title()">
      <div class="flex items-center gap-1.5 mb-3">
        <span class="block w-2 h-2 rounded-full bg-[var(--color-teal-500)] opacity-70"></span>
        <div class="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-widest flex items-center gap-1">
          {{ title() }}
          @if (tooltip()) {
            <span class="relative group">
              <span class="cursor-help" aria-hidden="true">ⓘ</span>
              <span class="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                           w-52 rounded-[var(--radius-sm)] bg-[var(--color-text-primary)]
                           px-2.5 py-1.5 text-[11px] leading-snug text-white
                           opacity-0 group-hover:opacity-100 transition-opacity z-50
                           normal-case tracking-normal font-normal whitespace-normal">
                {{ tooltip() }}
              </span>
            </span>
          }
        </div>
      </div>
      <div class="flex items-baseline gap-2">
        <span class="text-[1.65rem] font-bold tabular text-[var(--color-text-primary)] leading-none">
          {{ value() }}
        </span>
        @if (unit()) {
          <span class="text-sm text-[var(--color-text-secondary)]">
            {{ unit() }}
          </span>
        }
      </div>
      @if (trend() !== null) {
        <div class="mt-3 flex items-center gap-1.5">
          <app-trend-indicator
            [trend]="trend()!"
            [delta]="delta()"
            [inverse]="inverse()"
          />
          @if (deltaLabel()) {
            <span class="text-xs text-[var(--color-text-secondary)]">
              {{ deltaLabel() }}
            </span>
          }
        </div>
      }
    </article>
  `,
})
export class KpiTileComponent {
  readonly title = input.required<string>();
  readonly value = input.required<string>();
  readonly unit = input<string | null>(null);
  readonly trend = input<Trend | null>(null);
  readonly delta = input<number | null>(null);
  readonly deltaLabel = input<string | null>(null);
  readonly inverse = input<boolean>(false);
  readonly tooltip = input<string | null>(null);
}
