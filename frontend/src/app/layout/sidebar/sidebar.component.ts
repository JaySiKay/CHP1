import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthStore } from '../../core/auth/auth.store';
import type { UserRole } from '../../core/models/user.model';

interface NavItem {
  label: string;
  path: string;
  group: string;
  roles: UserRole[];
}

const NAV: NavItem[] = [
  { label: 'Business Pulse', path: '/app/business-pulse', group: 'Overview', roles: ['owner', 'admin'] },

  { label: 'Financials',     path: '/app/owner/financials', group: 'Owner', roles: ['owner'] },
  { label: 'Inventory value',path: '/app/owner/inventory',  group: 'Owner', roles: ['owner'] },
  { label: 'Suppliers',      path: '/app/owner/suppliers',  group: 'Owner', roles: ['owner'] },
  { label: 'Team',           path: '/app/owner/team',       group: 'Owner', roles: ['owner'] },

  { label: 'Inventory',      path: '/app/owner/live-inventory', group: 'Operations', roles: ['owner'] },
  { label: 'Sales',          path: '/app/owner/sales',          group: 'Operations', roles: ['owner'] },
  { label: 'Returns',        path: '/app/owner/returns',        group: 'Operations', roles: ['owner'] },
  { label: 'Discounts',      path: '/app/owner/discounts',      group: 'Operations', roles: ['owner'] },
  { label: 'Low stock',      path: '/app/owner/low-stock',      group: 'Operations', roles: ['owner'] },

  { label: 'Inventory',      path: '/app/admin/inventory',  group: 'Operations', roles: ['admin'] },
  { label: 'Sales',          path: '/app/admin/sales',      group: 'Operations', roles: ['admin'] },
  { label: 'Returns',        path: '/app/admin/returns',    group: 'Operations', roles: ['admin'] },
  { label: 'Discounts',      path: '/app/admin/discounts',  group: 'Operations', roles: ['admin'] },
  { label: 'Low stock',      path: '/app/admin/low-stock',  group: 'Operations', roles: ['admin'] },

  { label: 'Store profile',  path: '/app/settings/store',   group: 'Settings', roles: ['owner'] },
];

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside
      class="hidden lg:flex flex-col w-[252px] shrink-0 h-screen sticky top-0
             bg-[var(--color-surface)] border-r border-[var(--color-border-subtle)]"
      style="box-shadow: 2px 0 12px rgba(162, 140, 157, 0.10);"
      aria-label="Primary navigation">

      <div class="h-16 flex items-center px-5 border-b border-[var(--color-border-subtle)]">
        <span
          class="inline-flex w-9 h-9 rounded-[var(--radius-sm)]
                 items-center justify-center font-bold text-sm text-white"
          style="background: linear-gradient(135deg, var(--color-brand-500), var(--color-brand-700));
                 box-shadow: 2px 2px 8px rgba(113, 75, 103, 0.4);">
          A
        </span>
        <div class="ml-3">
          <div class="text-sm font-semibold tracking-tight text-[var(--color-text-primary)]">
            Analytics&nbsp;Hub
          </div>
          <div class="text-[10px] text-[var(--color-teal-500)] font-medium tracking-wide uppercase">
            Clothing Insights
          </div>
        </div>
      </div>

      <nav class="flex-1 overflow-y-auto py-4">
        @for (group of groups(); track group.name) {
          <div class="px-4 mb-5">
            <div class="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-widest
                        text-[var(--color-teal-500)] opacity-80">
              {{ group.name }}
            </div>
            <ul class="space-y-0.5">
              @for (item of group.items; track item.path) {
                <li>
                  <a
                    [routerLink]="item.path"
                    routerLinkActive="bg-[var(--color-brand-50)] text-[var(--color-brand-600)] font-semibold"
                    class="flex items-center px-3 h-9 rounded-[var(--radius-sm)]
                           text-sm text-[var(--color-text-secondary)]
                           hover:bg-[var(--color-brand-50)]
                           hover:text-[var(--color-brand-600)] transition-colors">
                    {{ item.label }}
                  </a>
                </li>
              }
            </ul>
          </div>
        }
      </nav>

      <div class="px-4 py-4 border-t border-[var(--color-border-subtle)]">
        <div class="text-[10px] font-semibold uppercase tracking-widest
                    text-[var(--color-text-secondary)] mb-1">
          Signed in as
        </div>
        <div class="text-xs font-medium text-[var(--color-text-primary)] truncate">
          {{ user()?.email }}
        </div>
        <div class="mt-1">
          <span class="chip chip-neutral text-[10px] px-2">{{ user()?.role }}</span>
        </div>
      </div>
    </aside>
  `,
})
export class SidebarComponent {
  private readonly authStore = inject(AuthStore);

  protected readonly user = this.authStore.user;

  protected readonly groups = computed(() => {
    const role = this.authStore.role();
    if (!role) return [];
    const allowed = NAV.filter((item) => item.roles.includes(role));
    const order = ['Overview', 'Owner', 'Operations', 'Settings'];
    return order
      .map((name) => ({
        name,
        items: allowed.filter((item) => item.group === name),
      }))
      .filter((g) => g.items.length > 0);
  });
}
