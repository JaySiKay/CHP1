import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, from, map, Observable, switchMap, tap, throwError } from 'rxjs';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { firebaseAuth } from '../firebase/firebase';
import { environment } from '../../../environment';
import { TokenStore } from './token.store';
import { HttpErrorResponse } from '@angular/common/http';
import type {
  AddStoreCredentials,
  AuthResult,
  BackendLoginResponse,
  LoginCredentials,
  RegisterCredentials,
} from '../models/user.model';


@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokenStore = inject(TokenStore);

  private readonly loginUrl = `${environment.apiBaseUrl}/auth/login/verify`;
  private readonly registerUrl = `${environment.apiBaseUrl}/auth/register`;
  private readonly addStoreUrl = `${environment.apiBaseUrl}/auth/add-store`;

  login(credentials: LoginCredentials): Observable<AuthResult> {
    return from(
      signInWithEmailAndPassword(
        firebaseAuth,
        credentials.email,
        credentials.password,
      ),
    ).pipe(
      switchMap((cred) =>
        from(cred.user.getIdToken()).pipe(
          switchMap((firebaseToken) =>
            this.syncWithBackend(credentials.email, firebaseToken),
          ),
        ),
      ),
    );
  }

  register(credentials: RegisterCredentials): Observable<AuthResult> {
    return from(
      createUserWithEmailAndPassword(
        firebaseAuth,
        credentials.email,
        credentials.password,
      ),
    ).pipe(
      switchMap((cred) =>
        from(updateProfile(cred.user, { displayName: credentials.username })).pipe(
          switchMap(() => from(cred.user.getIdToken(true))),
          switchMap((firebaseToken) =>
            this.syncRegistration(credentials, firebaseToken),
          ),
        ),
      ),
    );
  }

  private syncRegistration(
    credentials: RegisterCredentials,
    firebaseToken: string,
  ): Observable<AuthResult> {
    const body: Record<string, unknown> = { role: credentials.role };
    if (credentials.role === 'owner' && credentials.dbConfig) {
      const c = credentials.dbConfig;
      body['db_config'] = {
        host: c.host,
        port: c.port,
        db_name: c.dbName,
        user: c.dbUser,
        password: c.dbPassword,
      };
    }
    return this.http
      .post<BackendLoginResponse>(
        this.registerUrl,
        body,
        { headers: new HttpHeaders({ Authorization: `Bearer ${firebaseToken}` }) },
      )
      .pipe(
        tap(() => this.tokenStore.set(firebaseToken)),
        map((response) => ({
          userId: response.user_id,
          email: response.email ?? credentials.email,
          username: firebaseAuth.currentUser?.displayName ?? credentials.email,
          stores: response.stores,
        })),
      );
  }

  addStore(credentials: AddStoreCredentials): Observable<AuthResult> {
    return from(
      signInWithEmailAndPassword(firebaseAuth, credentials.email, credentials.password),
    ).pipe(
      switchMap((cred) =>
        from(cred.user.getIdToken()).pipe(
          switchMap((firebaseToken) => {
            const c = credentials.dbConfig;
            return this.http
              .post<BackendLoginResponse>(
                this.addStoreUrl,
                {
                  db_config: {
                    host: c.host,
                    port: c.port,
                    db_name: c.dbName,
                    user: c.dbUser,
                    password: c.dbPassword,
                  },
                },
                { headers: new HttpHeaders({ Authorization: `Bearer ${firebaseToken}` }) },
              )
              .pipe(
                tap(() => this.tokenStore.set(firebaseToken)),
                map((response) => ({
                  userId: response.user_id,
                  email: response.email ?? credentials.email,
                  username: firebaseAuth.currentUser?.displayName ?? credentials.email,
                  stores: response.stores,
                })),
                catchError((err: HttpErrorResponse) =>
                  throwError(() => new Error(err.error?.detail ?? err.message)),
                ),
              );
          }),
        ),
      ),
    );
  }

  refreshFromFirebase(): Observable<AuthResult> {
    const user = firebaseAuth.currentUser;
    if (!user) {
      throw new Error('No Firebase session to refresh from.');
    }
    return from(user.getIdToken(true)).pipe(
      switchMap((firebaseToken) =>
        this.syncWithBackend(user.email ?? '', firebaseToken),
      ),
    );
  }

  logout(): Observable<void> {
    this.tokenStore.clear();
    return from(signOut(firebaseAuth));
  }

  private syncWithBackend(
    email: string,
    firebaseToken: string,
  ): Observable<AuthResult> {
    return this.http
      .post<BackendLoginResponse>(
        this.loginUrl,
        { email, token: firebaseToken },
        { headers: new HttpHeaders({ Authorization: `Bearer ${firebaseToken}` }) },
      )
      .pipe(
        tap(() => this.tokenStore.set(firebaseToken)),
        map((response) => ({
          userId: response.user_id,
          email: response.email ?? email,
          username: firebaseAuth.currentUser?.displayName ?? response.email ?? email,
          stores: response.stores,
        })),
      );
  }
}
