import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardComponent } from '../../../shared/ui/card.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { StateEmptyComponent } from '../../../shared/ui/state-empty.component';
import { StateErrorComponent } from '../../../shared/ui/state-error.component';
import { StateLoadingComponent } from '../../../shared/ui/state-loading.component';
import { formatDate, toErrorMessage } from '../../../shared/format';
import { OwnerApi, type TeamMember } from '../owner.api';
import { AuthStore } from '../../../core/auth/auth.store';

@Component({
  selector: 'app-owner-team',
  standalone: true,
  imports: [
    CardComponent,
    PageHeaderComponent,
    StateEmptyComponent,
    StateErrorComponent,
    StateLoadingComponent,
    ReactiveFormsModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      title="Team"
      subtitle="Manage who has access to this store">
      <button actions type="button" class="btn btn-ghost" (click)="reload()">
        ↻ Refresh
      </button>
    </app-page-header>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2">
        @if (loading()) {
          <app-state-loading variant="table" />
        } @else if (error()) {
          <app-state-error [message]="error()!" (retry)="reload()" />
        } @else if (!allMembers().length) {
          <app-state-empty title="No team members yet."
            description="Invite an administrator to start sharing access." />
        } @else {
          <app-card title="Members">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-[var(--color-text-secondary)]">
                  <th class="py-2">Email</th>
                  <th class="py-2">Role</th>
                  <th class="py-2">Granted</th>
                  <th class="py-2"></th>
                </tr>
              </thead>
              <tbody>
                @for (m of pagedMembers(); track m.user_id) {
                  <tr class="border-t border-[var(--color-border-subtle)]">
                    <td class="py-2 font-medium">{{ m.email ?? m.user_id }}</td>
                    <td class="py-2">
                      <span class="chip" [class]="m.role === 'owner' ? 'chip-info' : 'chip-neutral'">
                        {{ m.role }}
                      </span>
                    </td>
                    <td class="py-2 text-[var(--color-text-secondary)]">
                      {{ m.granted_at ? fmtDate(m.granted_at) : '—' }}
                    </td>
                    <td class="py-2 text-right">
                      @if (m.user_id !== currentUserId()) {
                        <button type="button" class="btn btn-ghost h-8 text-xs"
                                [disabled]="revoking() === m.user_id"
                                (click)="onRevoke(m.user_id)">
                          {{ revoking() === m.user_id ? 'Revoking…' : 'Revoke' }}
                        </button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
            @if (totalPages() > 1) {
              <div class="flex items-center justify-between mt-4 pt-3 border-t border-[var(--color-border-subtle)]">
                <button type="button" class="btn btn-ghost h-8 px-3 text-xs"
                        [disabled]="page() === 1" (click)="prevPage()">← Previous</button>
                <span class="text-xs text-[var(--color-text-secondary)]">
                  Page {{ page() }} of {{ totalPages() }}
                </span>
                <button type="button" class="btn btn-ghost h-8 px-3 text-xs"
                        [disabled]="page() === totalPages()" (click)="nextPage()">Next →</button>
              </div>
            }
          </app-card>
        }
      </div>

      <app-card title="Grant access">
        <form [formGroup]="inviteForm" (ngSubmit)="onInvite()" class="space-y-3">
          <div>
            <label class="label" for="invite-email">Email</label>
            <input id="invite-email" type="email" class="input"
                   formControlName="email" placeholder="user@store.com" />
          </div>
          <div>
            <label class="label" for="invite-role">Role</label>
            <select id="invite-role" class="input" formControlName="role">
              <option value="admin">Admin</option>
              <option value="owner">Owner</option>
            </select>
          </div>
          @if (inviteError()) {
            <p class="text-xs text-[var(--color-danger)]">{{ inviteError() }}</p>
          }
          @if (inviteSuccess()) {
            <p class="text-xs text-[var(--color-success)]">{{ inviteSuccess() }}</p>
          }
          <button type="submit" class="btn btn-primary w-full"
                  [disabled]="inviteForm.invalid || inviting()">
            {{ inviting() ? 'Granting…' : 'Grant access' }}
          </button>
        </form>
      </app-card>
    </div>
  `,
})
export class OwnerTeamPage implements OnInit {
  private readonly api = inject(OwnerApi);
  private readonly fb = inject(FormBuilder);
  private readonly authStore = inject(AuthStore);

  private readonly PAGE_SIZE = 15;

  protected readonly currentUserId = computed(() => this.authStore.user()?.id ?? '');

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly allMembers = signal<TeamMember[]>([]);
  protected readonly page = signal(1);

  protected readonly pagedMembers = computed(() => {
    const start = (this.page() - 1) * this.PAGE_SIZE;
    return this.allMembers().slice(start, start + this.PAGE_SIZE);
  });

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.allMembers().length / this.PAGE_SIZE))
  );

  protected readonly inviting = signal(false);
  protected readonly inviteError = signal<string | null>(null);
  protected readonly inviteSuccess = signal<string | null>(null);
  protected readonly revoking = signal<string | null>(null);

  protected readonly inviteForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    role: ['admin' as 'owner' | 'admin', Validators.required],
  });

  protected readonly fmtDate = formatDate;

  ngOnInit(): void {
    this.reload();
  }

  protected prevPage(): void { this.page.update(p => p - 1); }
  protected nextPage(): void { this.page.update(p => p + 1); }

  protected reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.listTeam().subscribe({
      next: (members) => {
        this.allMembers.set(members);
        this.page.set(1);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(toErrorMessage(err, 'Could not load team.'));
        this.loading.set(false);
      },
    });
  }

  protected onInvite(): void {
    if (this.inviteForm.invalid) return;
    this.inviting.set(true);
    this.inviteError.set(null);
    this.inviteSuccess.set(null);

    const { email, role } = this.inviteForm.getRawValue();
    this.api
      .inviteTeamMember({ email, role })
      .subscribe({
        next: (resp) => {
          this.inviteSuccess.set(`Access granted to ${resp.email ?? email}`);
          this.inviteForm.reset();
          this.inviting.set(false);
          this.reload();
        },
        error: (err) => {
          this.inviteError.set(toErrorMessage(err, 'Could not send invite.'));
          this.inviting.set(false);
        },
      });
  }

  protected onRevoke(userId: string): void {
    this.revoking.set(userId);
    this.api.revokeTeamMember(userId).subscribe({
      next: () => {
        this.allMembers.update((curr) => curr.filter((m) => m.user_id !== userId));
        this.revoking.set(null);
      },
      error: (err) => {
        this.error.set(toErrorMessage(err, 'Could not revoke access.'));
        this.revoking.set(null);
      },
    });
  }
}
