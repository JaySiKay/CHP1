import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '../../../../core/auth/auth.store';
import type { StoreRef } from '../../../../core/models/user.model';

@Component({
  selector: 'app-select-store',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex items-center justify-center bg-[var(--color-canvas)] px-4 py-12">
      <div class="w-full max-w-sm">
        <div class="flex items-center justify-center gap-2 mb-8">
          <span
            class="inline-flex w-9 h-9 rounded-[var(--radius-sm)]
                   bg-[var(--color-brand-500)] text-white items-center justify-center
                   font-semibold">A</span>
          <span class="text-base font-semibold tracking-tight">Analytics&nbsp;Hub</span>
        </div>

        <div class="surface p-6">
          <h1 class="text-lg font-semibold">Select your account</h1>
          <p class="text-sm text-[var(--color-text-secondary)] mt-1 mb-5">
            You have access to multiple stores. Choose one to continue.
          </p>

          <ul class="space-y-2" role="list">
            @for (store of authStore.stores(); track store.store_id) {
              <li>
                <button
                  type="button"
                  class="w-full flex items-center gap-3 px-4 py-3
                         rounded-[var(--radius-sm)] border border-[var(--color-border-subtle)]
                         hover:border-[var(--color-brand-500)] hover:bg-[var(--color-canvas)]
                         transition-colors text-left"
                  (click)="onSelect(store)">
                  <div class="shrink-0 w-9 h-9 rounded-[var(--radius-sm)]
                              bg-[var(--color-brand-50)] flex items-center justify-center">
                    <svg class="w-4 h-4 text-[var(--color-brand-500)]" fill="none"
                         viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                      <path stroke-linecap="round" stroke-linejoin="round"
                            d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5
                               0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5
                               11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0
                               009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0
                               002.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001
                               0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318
                               3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19
                               1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0
                               00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0
                               00-.75.75v3.75c0 .415.336.75.75.75z" />
                    </svg>
                  </div>

                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium truncate">{{ store.name }}</p>
                    <p class="text-xs text-[var(--color-text-secondary)] capitalize mt-0.5">
                      {{ store.role }}
                    </p>
                  </div>

                  <svg class="shrink-0 w-4 h-4 text-[var(--color-text-secondary)]" fill="none"
                       viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </li>
            }
          </ul>

          <button
            type="button"
            class="mt-5 text-sm text-[var(--color-text-secondary)]
                   hover:text-[var(--color-text-primary)] transition-colors"
            (click)="onBack()">
            ← Back to sign in
          </button>
        </div>
      </div>
    </div>
  `,
})
export class SelectStorePage {
  protected readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  constructor() {
    effect(() => {
      const status = this.authStore.status();
      if (status === 'idle' || status === 'loading') return;
      if (status === 'success') this.router.navigateByUrl('/app/business-pulse');
      if (status === 'no-access') this.router.navigateByUrl('/pending');
    });
  }

  protected onSelect(store: StoreRef): void {
    this.authStore.selectStore(store);
    this.router.navigateByUrl('/app/business-pulse');
  }

  protected onBack(): void {
    this.authStore.logout();
    this.router.navigateByUrl('/login');
  }
}
