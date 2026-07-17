import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Store } from '@ngxs/store';

type AuthSnapshot = {
  auth?: {
    token?: string | null;
  };
};

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(Store).selectSnapshot((state: AuthSnapshot) => state.auth?.token);

  if (!token) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    }),
  );
};
