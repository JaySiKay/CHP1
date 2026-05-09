import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardComponent } from '../../../shared/ui/card.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { toErrorMessage } from '../../../shared/format';
import {
  SettingsApi,
  type DatabaseConnectResponse,
} from '../settings.api';

@Component({
  selector: 'app-settings-database',
  standalone: true,
  imports: [
    CardComponent,
    PageHeaderComponent,
    ReactiveFormsModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      title="Database"
      subtitle="Connect your store's source database" />

    <div class="max-w-lg">
      <app-card title="Connect">
        <form [formGroup]="form" (ngSubmit)="onConnect()" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="label" for="host">Host</label>
              <input id="host" class="input" formControlName="host"
                     placeholder="192.168.1.100" />
            </div>
            <div>
              <label class="label" for="port">Port</label>
              <input id="port" type="number" class="input"
                     formControlName="port" placeholder="5432" />
            </div>
          </div>
          <div>
            <label class="label" for="db">Database name</label>
            <input id="db" class="input" formControlName="db_name" />
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="label" for="user">User</label>
              <input id="user" class="input" formControlName="user" />
            </div>
            <div>
              <label class="label" for="pwd">Password</label>
              <input id="pwd" type="password" class="input"
                     formControlName="password" />
            </div>
          </div>

          @if (connectError()) {
            <p class="text-xs text-[var(--color-danger)]">{{ connectError() }}</p>
          }

          <div class="flex justify-end gap-2">
            <button type="submit" class="btn btn-primary"
                    [disabled]="form.invalid || connecting()">
              {{ connecting() ? 'Connecting…' : 'Test & save' }}
            </button>
          </div>
        </form>

        @if (connectResult(); as r) {
          <div class="mt-4 p-3 rounded-[var(--radius-sm)]"
               [class]="r.status === 'success'
                 ? 'bg-[var(--color-success-soft)]'
                 : 'bg-[var(--color-danger-soft)]'">
            <p class="text-sm font-medium">
              {{ r.status === 'success' ? 'Connected successfully.' : 'Connection failed.' }}
            </p>
            @if (r.store_id) {
              <p class="text-xs text-[var(--color-text-secondary)] mt-1">
                Store ID: {{ r.store_id }}
              </p>
            }
          </div>
        }
      </app-card>
    </div>
  `,
})
export class SettingsDatabasePage {
  private readonly api = inject(SettingsApi);
  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group({
    host: ['', Validators.required],
    port: [5432, [Validators.required, Validators.min(1)]],
    db_name: ['', Validators.required],
    user: ['', Validators.required],
    password: ['', Validators.required],
  });

  protected readonly connecting = signal(false);
  protected readonly connectError = signal<string | null>(null);
  protected readonly connectResult = signal<DatabaseConnectResponse | null>(null);

  protected onConnect(): void {
    if (this.form.invalid) return;
    this.connecting.set(true);
    this.connectError.set(null);
    this.connectResult.set(null);

    this.api.connectDatabase(this.form.getRawValue()).subscribe({
      next: (resp) => {
        this.connectResult.set(resp);
        this.connecting.set(false);
      },
      error: (err) => {
        this.connectError.set(toErrorMessage(err, 'Could not connect.'));
        this.connecting.set(false);
      },
    });
  }
}
