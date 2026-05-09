import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-forbidden',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex items-center justify-center bg-[var(--color-canvas)] px-6">
      <div class="surface p-10 max-w-md text-center">
        <div class="mx-auto w-12 h-12 rounded-full
                    bg-[var(--color-danger-soft)] text-[var(--color-danger)]
                    flex items-center justify-center text-xl font-semibold mb-3">
          !
        </div>
        <h1 class="text-lg font-semibold">Access denied</h1>
        <p class="text-sm text-[var(--color-text-secondary)] mt-2">
          Your role does not have permission to view this page.
        </p>
        <a routerLink="/app/business-pulse" class="btn btn-primary mt-6 inline-flex">
          Back to Business Pulse
        </a>
      </div>
    </div>
  `,
})
export class ForbiddenPage {}
