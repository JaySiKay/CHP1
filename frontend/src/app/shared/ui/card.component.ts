import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.title]': 'null' },
  template: `
    <section class="surface" [class.p-5]="padded()">
      @if (title()) {
        <header class="flex items-baseline justify-between mb-4
                        pb-3 border-b border-[var(--color-border-subtle)]">
          <h3 class="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
            <span class="inline-block w-1 h-4 rounded-full bg-[var(--color-teal-500)]"
                  aria-hidden="true"></span>
            {{ title() }}
            @if (tooltip()) {
              <span class="relative group">
                <span class="cursor-help text-xs font-normal text-[var(--color-text-secondary)]"
                      aria-hidden="true">ⓘ</span>
                <span class="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                             w-60 rounded-[var(--radius-sm)] bg-[var(--color-text-primary)]
                             px-2.5 py-1.5 text-[11px] leading-snug text-white
                             opacity-0 group-hover:opacity-100 transition-opacity z-50
                             normal-case tracking-normal font-normal whitespace-normal">
                  {{ tooltip() }}
                </span>
              </span>
            }
          </h3>
          @if (subtitle()) {
            <span class="text-xs text-[var(--color-text-secondary)]">
              {{ subtitle() }}
            </span>
          }
        </header>
      }
      <ng-content />
    </section>
  `,
})
export class CardComponent {
  readonly title = input<string | null>(null);
  readonly subtitle = input<string | null>(null);
  readonly padded = input<boolean>(true);
  readonly tooltip = input<string | null>(null);
}
