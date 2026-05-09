import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="flex items-end justify-between mb-7">
      <div>
        <h1 class="text-2xl font-semibold text-[var(--color-teal-500)] tracking-tight">
          {{ title() }}
        </h1>
        @if (subtitle()) {
          <p class="text-sm text-[var(--color-text-secondary)] mt-1">
            {{ subtitle() }}
          </p>
        }
      </div>
      <div class="flex items-center gap-2">
        <ng-content select="[actions]" />
      </div>
    </header>
  `,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);
}
