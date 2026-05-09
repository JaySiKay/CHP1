import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TokenStore {
  private readonly _token = signal<string | null>(null);
  readonly token = this._token.asReadonly();

  set(token: string | null): void {
    this._token.set(token);
  }

  clear(): void {
    this._token.set(null);
  }

  current(): string | null {
    return this._token();
  }
}
