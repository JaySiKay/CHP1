import { inject } from '@angular/core';
import {
  HttpRequest,
  HttpHandlerFn,
  type HttpEvent,
  HttpInterceptorFn,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { TokenStore } from './token.store';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const tokenStore = inject(TokenStore);
  const jwt = tokenStore.current();

  const isLoginCall = req.url.endsWith('/auth/login');

  if (!jwt || isLoginCall || req.headers.has('Authorization')) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${jwt}` },
    }),
  );
};
