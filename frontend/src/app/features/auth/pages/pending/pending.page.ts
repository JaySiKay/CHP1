import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '../../../../core/auth/auth.store';

@Component({
  selector: 'app-pending',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex items-center justify-center bg-[var(--color-canvas)] px-4">
      <div class="w-full max-w-sm text-center">
        <div class="flex items-center justify-center gap-2 mb-8">
          <span
            class="inline-flex w-9 h-9 rounded-[var(--radius-sm)]
                   bg-[var(--color-brand-500)] text-white items-center justify-center
                   font-semibold">A</span>
          <span class="text-base font-semibold tracking-tight">Analytics&nbsp;Hub</span>
        </div>

        <div class="surface p-8">
          @if (authStore.isAuthenticated()) {
            <div class="w-12 h-12 rounded-full bg-[var(--color-brand-50)]
                        flex items-center justify-center mx-auto mb-4">
              <svg class="w-6 h-6 text-[var(--color-brand-500)] animate-spin" fill="none"
                   viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10"
                        stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>

            <h1 class="text-lg font-semibold mb-2">Connecting to your store…</h1>
            <p class="text-sm text-[var(--color-text-secondary)] leading-relaxed">
              Your account is ready. You'll be redirected to your dashboard in a moment.
            </p>
          } @else {
            <div class="w-12 h-12 rounded-full bg-[var(--color-brand-50)]
                        flex items-center justify-center mx-auto mb-4">
              <svg class="w-6 h-6 text-[var(--color-brand-500)]" fill="none"
                   viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round"
                      d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
              </svg>
            </div>

            <h1 class="text-lg font-semibold mb-2">Waiting for access</h1>
            <p class="text-sm text-[var(--color-text-secondary)] leading-relaxed">
              Your account has been created. A store owner needs to grant you
              access before you can sign in.
            </p>

            <button
              type="button"
              class="mt-6 text-sm text-[var(--color-text-secondary)]
                     hover:text-[var(--color-text-primary)] transition-colors"
              (click)="onSignOut()">
              ← Sign out
            </button>
          }
        </div>
      </div>
    </div>
  `,
})
export class PendingPage {
  protected readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  constructor() {
    if (this.authStore.isAuthenticated()) {
      setTimeout(() => this.router.navigateByUrl('/app/business-pulse'), 2000);
    }
  }

  protected onSignOut(): void {
    this.authStore.logout();
    this.router.navigateByUrl('/login');
  }
}
