import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-state-loading',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div role="status" [attr.aria-label]="label()">
      @switch (variant()) {
        @case ('kpi-grid') {
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="surface p-4">
              <div class="skeleton h-3 w-1/2 mb-3"></div>
              <div class="skeleton h-7 w-3/4"></div>
            </div>
            <div class="surface p-4">
              <div class="skeleton h-3 w-1/2 mb-3"></div>
              <div class="skeleton h-7 w-3/4"></div>
            </div>
            <div class="surface p-4">
              <div class="skeleton h-3 w-1/2 mb-3"></div>
              <div class="skeleton h-7 w-3/4"></div>
            </div>
            <div class="surface p-4">
              <div class="skeleton h-3 w-1/2 mb-3"></div>
              <div class="skeleton h-7 w-3/4"></div>
            </div>
          </div>
        }
        @case ('chart') {
          <div class="surface p-4">
            <div class="skeleton h-4 w-1/3 mb-4"></div>
            <div class="skeleton h-64 w-full"></div>
          </div>
        }
        @case ('table') {
          <div class="surface p-4">
            <div class="skeleton h-4 w-1/3 mb-4"></div>
            <div class="space-y-2">
              <div class="skeleton h-5 w-full"></div>
              <div class="skeleton h-5 w-full"></div>
              <div class="skeleton h-5 w-full"></div>
              <div class="skeleton h-5 w-full"></div>
              <div class="skeleton h-5 w-full"></div>
            </div>
          </div>
        }
        @default {
          <div class="surface p-6">
            <div class="skeleton h-5 w-1/3 mb-4"></div>
            <div class="skeleton h-24 w-full"></div>
          </div>
        }
      }
    </div>
  `,
})
export class StateLoadingComponent {
  readonly variant = input<'kpi-grid' | 'chart' | 'table' | 'default'>('default');
  readonly label = input<string>('Loading');
}
