import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { onAuthStateChanged } from 'firebase/auth';
import { pipe, switchMap, tap } from 'rxjs';
import type {
  AddStoreCredentials,
  AuthResult,
  LoginCredentials,
  RegisterCredentials,
  StoreRef,
  User,
  UserRole,
} from '../models/user.model';
import { firebaseAuth } from '../firebase/firebase';
import { AuthService } from './auth.service';

type LoadingStatus = 'idle' | 'loading' | 'success' | 'error' | 'store-selection' | 'no-access';

const STORE_KEY = 'chp_selected_store_id';

interface AuthState {
  user: User | null;
  pending: AuthResult | null;
  status: LoadingStatus;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  pending: null,
  status: 'idle',
  error: null,
};

function buildUser(result: AuthResult, storeRef: StoreRef): User {
  return {
    id: result.userId,
    username: result.username,
    email: result.email,
    role: storeRef.role,
    storeId: storeRef.store_id,
  };
}

type ResolveResult =
  | { user: User; pending: null; status: 'success' }
  | { user: null; pending: AuthResult; status: 'store-selection' }
  | { user: null; pending: null; status: 'no-access' };

function resolveStore(result: AuthResult, forceSelection = false): ResolveResult {
  if (result.stores.length === 0) {
    return { user: null, pending: null, status: 'no-access' };
  }

  if (result.stores.length === 1) {
    const storeRef = result.stores[0];
    localStorage.setItem(STORE_KEY, storeRef.store_id);
    return { user: buildUser(result, storeRef), pending: null, status: 'success' };
  }

  if (!forceSelection) {
    const savedId = localStorage.getItem(STORE_KEY);
    if (savedId) {
      const match = result.stores.find((s) => s.store_id === savedId);
      if (match) {
        return { user: buildUser(result, match), pending: null, status: 'success' };
      }
    }
  }

  return { user: null, pending: result, status: 'store-selection' };
}

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState<AuthState>(initialState),

  withComputed(({ user, status, pending }) => ({
    isAuthenticated: computed(() => user() !== null),
    role: computed<UserRole | null>(() => user()?.role ?? null),
    isOwner: computed(() => user()?.role === 'owner'),
    isAdmin: computed(() => user()?.role === 'admin'),
    isLoading: computed(() => status() === 'loading'),
    needsStoreSelection: computed(() => status() === 'store-selection'),
    noAccess: computed(() => status() === 'no-access'),
    stores: computed<StoreRef[]>(() => pending()?.stores ?? []),
  })),

  withMethods((store, authService = inject(AuthService)) => ({
    login: rxMethod<LoginCredentials>(
      pipe(
        tap(() => patchState(store, { status: 'loading', error: null })),
        switchMap((credentials) =>
          authService.login(credentials).pipe(
            tapResponse({
              next: (result) => patchState(store, resolveStore(result, true)),
              error: (err: Error) =>
                patchState(store, { status: 'error', error: err.message }),
            }),
          ),
        ),
      ),
    ),

    register: rxMethod<RegisterCredentials>(
      pipe(
        tap(() => patchState(store, { status: 'loading', error: null })),
        switchMap((credentials) =>
          authService.register(credentials).pipe(
            tapResponse({
              next: (result) => patchState(store, resolveStore(result)),
              error: (err: Error) =>
                patchState(store, { status: 'error', error: err.message }),
            }),
          ),
        ),
      ),
    ),

    refreshFromFirebase: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { status: 'loading' })),
        switchMap(() =>
          authService.refreshFromFirebase().pipe(
            tapResponse({
              next: (result) => patchState(store, resolveStore(result)),
              error: () =>
                patchState(store, { user: null, pending: null, status: 'idle' }),
            }),
          ),
        ),
      ),
    ),

    addStore: rxMethod<AddStoreCredentials>(
      pipe(
        tap(() => patchState(store, { status: 'loading', error: null })),
        switchMap((credentials) =>
          authService.addStore(credentials).pipe(
            tapResponse({
              next: (result) => {
                if (result.stores.length > 0) {
                  patchState(store, { user: null, pending: result, status: 'store-selection' });
                } else {
                  patchState(store, { user: null, pending: null, status: 'no-access' });
                }
              },
              error: (err: Error) =>
                patchState(store, { status: 'error', error: err.message }),
            }),
          ),
        ),
      ),
    ),

    logout: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { user: null, pending: null, status: 'idle', error: null })),
        switchMap(() =>
          authService.logout().pipe(
            tapResponse({
              next: () => {},
              error: (err: Error) =>
                patchState(store, { status: 'error', error: err.message }),
            }),
          ),
        ),
      ),
    ),

    selectStore(storeRef: StoreRef): void {
      const result = store.pending();
      if (!result) return;
      localStorage.setItem(STORE_KEY, storeRef.store_id);
      patchState(store, {
        user: buildUser(result, storeRef),
        pending: null,
        status: 'success',
      });
    },
  })),

  withHooks({
    onInit(store) {
      onAuthStateChanged(firebaseAuth, (firebaseUser) => {
        if (firebaseUser) {
          if (store.status() !== 'loading') {
            store.refreshFromFirebase();
          }
        } else {
          patchState(store, { user: null, pending: null, status: 'idle' });
        }
      });
    },
  }),
);
