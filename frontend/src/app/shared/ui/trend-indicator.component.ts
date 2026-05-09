import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type Trend = 'up' | 'down' | 'flat';

@Component({
  selector: 'app-trend-indicator',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="chip" [class]="chipClass()">
      <span aria-hidden="true">{{ arrow() }}</span>
      <span class="tabular">{{ formattedDelta() }}</span>
    </span>
  `,
})
export class TrendIndicatorComponent {
  readonly trend = input<Trend>('flat');
  readonly delta = input<number | null>(null);
  readonly inverse = input<boolean>(false);

  protected readonly arrow = computed(() => {
    switch (this.trend()) {
      case 'up':
        return '↑';
      case 'down':
        return '↓';
      default:
        return '→';
    }
  });

  protected readonly chipClass = computed(() => {
    const t = this.trend();
    if (t === 'flat') return 'chip-neutral';
    const positive = this.inverse() ? t === 'down' : t === 'up';
    return positive ? 'chip-success' : 'chip-danger';
  });

  protected readonly formattedDelta = computed(() => {
    const d = this.delta();
    if (d === null || d === undefined) return '';
    const sign = d > 0 ? '+' : '';
    return `${sign}${d.toFixed(1)}%`;
  });
}
