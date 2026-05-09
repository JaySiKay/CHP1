import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export type Period = 'week' | 'month';

@Component({
  selector: 'app-period-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div role="group" aria-label="Period"
         class="inline-flex rounded-[var(--radius-sm)] border
                border-[var(--color-border-subtle)] bg-[var(--color-surface)]
                p-0.5 text-sm">
      <button
        type="button"
        class="px-3 h-8 rounded-[var(--radius-sm)] transition-colors"
        [class]="value() === 'week'
          ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)] font-medium'
          : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'"
        (click)="select('week')"
      >Week</button>
      <button
        type="button"
        class="px-3 h-8 rounded-[var(--radius-sm)] transition-colors"
        [class]="value() === 'month'
          ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)] font-medium'
          : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'"
        (click)="select('month')"
      >Month</button>
    </div>
  `,
})
export class PeriodPickerComponent {
  readonly value = input<Period>('week');
  readonly valueChange = output<Period>();

  protected select(p: Period): void {
    if (p !== this.value()) {
      this.valueChange.emit(p);
    }
  }
}
