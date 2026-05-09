import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex bg-[var(--color-canvas)]">
      <app-sidebar />
      <div class="flex-1 min-w-0 flex flex-col">
        <app-topbar />
        <main class="flex-1 overflow-x-hidden">
          <div class="max-w-[1280px] mx-auto px-6 py-6">
            <router-outlet />
          </div>
        </main>
      </div>
    </div>
  `,
})
export class ShellComponent {}
