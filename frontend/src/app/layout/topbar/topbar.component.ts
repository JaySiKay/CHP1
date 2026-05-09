import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '../../core/auth/auth.store';
import { PeriodStore } from '../../core/ui/period.store';
import { SettingsApi, type StoreProfile } from '../../features/settings/settings.api';
import { PeriodPickerComponent } from '../../shared/ui/period-picker.component';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [PeriodPickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header
      class="h-14 flex items-center justify-between gap-4 px-6
             bg-[var(--color-surface)] border-b border-[var(--color-border-subtle)]
             sticky top-0 z-10">
      <div class="flex items-baseline gap-3 min-w-0">
        <h2 class="text-sm font-semibold truncate">
          {{ storeName() }}
        </h2>
        <span class="text-xs text-[var(--color-text-secondary)] hidden md:inline">
          {{ storeMeta() }}
        </span>
      </div>

      <div class="flex items-center gap-3">
        <app-period-picker
          [value]="period()"
          (valueChange)="onPeriodChange($event)" />

        <div class="relative">
          <button
            type="button"
            class="btn btn-ghost h-9"
            aria-haspopup="menu"
            [attr.aria-expanded]="menuOpen()"
            (click)="toggleMenu()">
            <span class="inline-flex w-6 h-6 rounded-full
                         bg-[var(--color-brand-100)] text-[var(--color-brand-700)]
                         items-center justify-center text-xs font-semibold">
              {{ initials() }}
            </span>
            <span class="hidden md:inline text-sm">{{ user()?.email }}</span>
            <span aria-hidden="true">▾</span>
          </button>

          @if (menuOpen()) {
            <div role="menu"
                 class="absolute right-0 mt-2 w-56 surface p-1 shadow-lg z-20">
              <div class="px-3 py-2 text-xs text-[var(--color-text-secondary)]">
                Signed in as
                <div class="text-[var(--color-text-primary)] font-medium truncate">
                  {{ user()?.email }}
                </div>
              </div>
              <hr class="border-[var(--color-border-subtle)]" />
              <button type="button" role="menuitem"
                      class="w-full text-left px-3 h-9 rounded-[var(--radius-sm)]
                             hover:bg-[var(--color-canvas)] text-sm"
                      (click)="onLogout()">
                Sign out
              </button>
            </div>
          }
        </div>
      </div>
    </header>
  `,
})
export class TopbarComponent {
  private readonly authStore = inject(AuthStore);
  private readonly periodStore = inject(PeriodStore);
  private readonly settingsApi = inject(SettingsApi);
  private readonly router = inject(Router);

  protected readonly user = this.authStore.user;
  protected readonly period = this.periodStore.period;
  protected readonly menuOpen = signal(false);
  protected readonly profile = signal<StoreProfile | null>(null);

  protected readonly storeName = computed(
    () => this.profile()?.name ?? 'Loading store…',
  );
  protected readonly storeMeta = computed(() => {
    const p = this.profile();
    return p ? `${p.currency} · ${p.timezone}` : '';
  });
  protected readonly initials = computed(() => {
    const email = this.user()?.email ?? '';
    return email.slice(0, 1).toUpperCase() || '?';
  });

  constructor() {
    this.settingsApi.getStoreProfile().subscribe({
      next: (p) => this.profile.set(p),
      error: () => this.profile.set(null),
    });
  }

  protected onPeriodChange(p: 'week' | 'month'): void {
    this.periodStore.set(p);
  }

  protected toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }

  protected onLogout(): void {
    this.menuOpen.set(false);
    this.authStore.logout();
    this.router.navigateByUrl('/login');
  }
}
