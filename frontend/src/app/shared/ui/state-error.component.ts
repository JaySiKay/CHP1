import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-state-error',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="surface p-6 border-l-4" style="border-left-color: var(--color-danger);"
         role="alert">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-sm font-medium text-[var(--color-text-primary)]">
            {{ title() }}
          </p>
          <p class="text-xs text-[var(--color-text-secondary)] mt-1">
            {{ message() }}
          </p>
        </div>
        @if (showRetry()) {
          <button type="button" class="btn btn-ghost" (click)="retry.emit()">
            Retry
          </button>
        }
      </div>
    </div>
  `,
})
export class StateErrorComponent {
  readonly title = input<string>('Something went wrong');
  readonly message = input<string>('Please try again.');
  readonly showRetry = input<boolean>(true);
  readonly retry = output<void>();
}
