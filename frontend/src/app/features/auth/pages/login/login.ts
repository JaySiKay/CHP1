import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../../../core/auth/auth.store';

type LoginMode = 'login' | 'add-shop';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  protected readonly authStore = inject(AuthStore);

  protected readonly mode = signal<LoginMode>('login');

  protected readonly loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  protected readonly shopForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    dbHost: ['', Validators.required],
    dbPort: [5432, [Validators.required, Validators.min(1), Validators.max(65535)]],
    dbName: ['', Validators.required],
    dbUser: ['', Validators.required],
    dbPassword: ['', Validators.required],
  });

  constructor() {
    effect(() => {
      const status = this.authStore.status();
      if (status === 'success') this.router.navigateByUrl('/app/business-pulse');
      if (status === 'no-access') this.router.navigateByUrl('/pending');
      if (status === 'store-selection') this.router.navigateByUrl('/select-store');
    });
  }

  protected enterAddShop(): void {
    this.mode.set('add-shop');
  }

  protected exitAddShop(): void {
    this.shopForm.reset({ dbPort: 5432 });
    this.mode.set('login');
  }

  protected onSubmit(): void {
    if (this.loginForm.invalid) return;
    this.authStore.login(this.loginForm.getRawValue());
  }

  protected onSubmitShop(): void {
    if (this.shopForm.invalid) return;
    const val = this.shopForm.getRawValue();
    this.authStore.addStore({
      email: val.email,
      password: val.password,
      dbConfig: {
        host: val.dbHost,
        port: val.dbPort,
        dbName: val.dbName,
        dbUser: val.dbUser,
        dbPassword: val.dbPassword,
      },
    });
  }

}
