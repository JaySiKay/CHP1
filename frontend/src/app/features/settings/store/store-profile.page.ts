import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { CardComponent } from '../../../shared/ui/card.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { StateErrorComponent } from '../../../shared/ui/state-error.component';
import { StateLoadingComponent } from '../../../shared/ui/state-loading.component';
import { formatDate, toErrorMessage } from '../../../shared/format';
import { SettingsApi, type StoreProfile } from '../settings.api';

@Component({
  selector: 'app-settings-store-profile',
  standalone: true,
  imports: [
    CardComponent,
    PageHeaderComponent,
    StateErrorComponent,
    StateLoadingComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      title="Store profile"
      subtitle="Identity and locale used across the app" />

    @if (loading()) {
      <app-state-loading />
    } @else if (loadError()) {
      <app-state-error [message]="loadError()!" (retry)="reload()" />
    } @else if (profile()) {
      <div class="max-w-lg">
        <app-card title="Profile">
          <dl class="text-sm space-y-3">
            <div class="flex justify-between">
              <dt class="text-[var(--color-text-secondary)]">Name</dt>
              <dd class="font-medium">{{ profile()!.name }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-[var(--color-text-secondary)]">Timezone</dt>
              <dd>{{ profile()!.timezone }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-[var(--color-text-secondary)]">Currency</dt>
              <dd>{{ profile()!.currency }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-[var(--color-text-secondary)]">Last sales sync</dt>
              <dd>{{ profile()!.last_sync_sales ? fmtDate(profile()!.last_sync_sales!) : '—' }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-[var(--color-text-secondary)]">Last returns sync</dt>
              <dd>{{ profile()!.last_sync_returns ? fmtDate(profile()!.last_sync_returns!) : '—' }}</dd>
            </div>
          </dl>
        </app-card>
      </div>
    }
  `,
})
export class SettingsStoreProfilePage implements OnInit {
  private readonly api = inject(SettingsApi);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly profile = signal<StoreProfile | null>(null);
  protected readonly fmtDate = formatDate;

  ngOnInit(): void {
    this.reload();
  }

  protected reload(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.api.getStoreProfile().subscribe({
      next: (p) => {
        this.profile.set(p);
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set(toErrorMessage(err, 'Could not load store profile.'));
        this.loading.set(false);
      },
    });
  }
}

