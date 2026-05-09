import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-state-empty',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="surface p-10 text-center" role="status">
      <div class="mx-auto w-12 h-12 rounded-full bg-[var(--color-canvas)]
                  flex items-center justify-center text-[var(--color-text-secondary)]
                  text-xl mb-3">
        ∅
      </div>
      <p class="text-sm font-medium text-[var(--color-text-primary)]">
        {{ title() }}
      </p>
      @if (description()) {
        <p class="text-xs text-[var(--color-text-secondary)] mt-1 max-w-md mx-auto">
          {{ description() }}
        </p>
      }
    </div>
  `,
})
export class StateEmptyComponent {
  readonly title = input<string>('No data available');
  readonly description = input<string | null>(null);
}
