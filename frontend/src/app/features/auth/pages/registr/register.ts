import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../../../core/auth/auth.store';
import type { RegisterCredentials, UserRole } from '../../../../core/models/user.model';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  protected readonly authStore = inject(AuthStore);

  protected readonly selectedRole = signal<UserRole | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    dbHost: [''],
    dbPort: [5432, [Validators.min(1), Validators.max(65535)]],
    dbName: [''],
    dbUser: [''],
    dbPassword: [''],
  });

  private readonly dbFields = ['dbHost', 'dbName', 'dbUser', 'dbPassword'] as const;

  constructor() {
    effect(() => {
      const status = this.authStore.status();
      if (status === 'success') {
        if (this.selectedRole() === 'owner') {
          this.router.navigateByUrl('/pending');
        } else {
          this.router.navigateByUrl('/app/business-pulse');
        }
      }
      if (status === 'no-access') this.router.navigateByUrl('/pending');
      if (status === 'store-selection') this.router.navigateByUrl('/select-store');
    });

    effect(() => {
      const role = this.selectedRole();
      this.dbFields.forEach((f) => {
        const ctrl = this.form.get(f)!;
        if (role === 'owner') {
          ctrl.addValidators(Validators.required);
        } else {
          ctrl.removeValidators(Validators.required);
        }
        ctrl.updateValueAndValidity({ emitEvent: false });
      });
    });
  }

  protected selectRole(role: UserRole | null): void {
    this.selectedRole.set(role);
  }

  protected get isFormReady(): boolean {
    return this.selectedRole() !== null && this.form.valid;
  }

  protected onSubmit(): void {
    const role = this.selectedRole();
    if (!role || this.form.invalid) return;

    const val = this.form.getRawValue();
    const credentials: RegisterCredentials = {
      username: val.username,
      email: val.email,
      password: val.password,
      role,
      ...(role === 'owner'
        ? {
            dbConfig: {
              host: val.dbHost,
              port: val.dbPort,
              dbName: val.dbName,
              dbUser: val.dbUser,
              dbPassword: val.dbPassword,
            },
          }
        : {}),
    };
    this.authStore.register(credentials);
  }

}
