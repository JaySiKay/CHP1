import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthStore } from './auth.store';
import type { UserRole } from '../models/user.model';

export function roleGuard(...allowed: UserRole[]): CanActivateFn {
  return () => {
    const authStore = inject(AuthStore);
    const router = inject(Router);

    if (!authStore.isAuthenticated()) {
      return router.createUrlTree(['/login']);
    }

    const role = authStore.role();
    if (role && allowed.includes(role)) {
      return true;
    }
    return router.createUrlTree(['/forbidden']);
  };
}
