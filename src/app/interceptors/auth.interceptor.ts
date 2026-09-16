import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { catchError, throwError } from 'rxjs';
import { Logout } from '../pages/auth/services/auth/auth.actions';

type AuthSnapshot = {
  auth?: {
    token?: string | null;
  };
};

let sessionRedirectInProgress = false;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const store = inject(Store);
  const router = inject(Router);
  const token = store.selectSnapshot((state: AuthSnapshot) => state.auth?.token);

  const authRequest = req.clone({
    withCredentials: true,
    ...(token ? { setHeaders: { Authorization: `Bearer ${token}` } } : {}),
  });

  return next(authRequest).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        handleExpiredSession(store, router);
      }

      return throwError(() => error);
    }),
  );
};

const handleExpiredSession = (store: Store, router: Router): void => {
  if (sessionRedirectInProgress) {
    return;
  }

  sessionRedirectInProgress = true;
  const returnUrl = router.url.startsWith('/auth') ? '/dashboard' : router.url;

  store.dispatch(new Logout()).subscribe({
    complete: () => {
      void router.navigate(['/auth/login'], {
        queryParams: {
          returnUrl,
          reason: 'session-expired',
        },
      }).finally(() => {
        sessionRedirectInProgress = false;
      });
    },
    error: () => {
      sessionRedirectInProgress = false;
      void router.navigate(['/auth/login'], {
        queryParams: {
          returnUrl,
          reason: 'session-expired',
        },
      });
    },
  });
};
