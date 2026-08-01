import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router, UrlTree } from '@angular/router';
import { Store } from '@ngxs/store';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { LoadLoggedInUser } from '../pages/auth/services/auth/auth.actions';
import { AuthProfile } from '../pages/auth/services/auth/auth.state.model';
import { AuthState } from '../pages/auth/services/auth/auth.states';

type DashboardRole = 'super_admin' | 'portfolio_officer' | 'extension_officer' | 'input_provider';

const dashboardRouteByRole: Record<DashboardRole, string> = {
  super_admin: '/dashboard/super-admin',
  portfolio_officer: '/dashboard/portfolio-officer',
  extension_officer: '/dashboard/extension-officer',
  input_provider: '/dashboard/input-provider',
};

export const authGuard: CanActivateFn = (route, state) => {
  const store = inject(Store);
  const router = inject(Router);
  const allowedRoles = route.data?.['roles'] as string[] | undefined;

  return resolveSignedInUser(store).pipe(
    map(() => authorizeRoute(store, router, state.url, allowedRoles)),
    catchError(() => of(createLoginRedirect(router, state.url))),
  );
};

export const dashboardRedirectGuard: CanMatchFn = () => {
  const store = inject(Store);
  const router = inject(Router);

  return resolveSignedInUser(store).pipe(
    map(() => {
      const profile = store.selectSnapshot(AuthState.getProfile);

      if (!profile) {
        return createLoginRedirect(router, '/dashboard');
      }

      const dashboardPath = getDashboardPath(profile);

      if (!dashboardPath) {
        return router.createUrlTree(['/home']);
      }

      return router.createUrlTree([dashboardPath]);
    }),
    catchError(() => of(createLoginRedirect(router, '/dashboard'))),
  );
};

const resolveSignedInUser = (store: Store): Observable<unknown> => {
  const isAuthenticated = store.selectSnapshot(AuthState.isAuthenticated);
  const token = store.selectSnapshot(AuthState.getToken);
  const profile = store.selectSnapshot(AuthState.getProfile);

  if (!isAuthenticated || !token) {
    return of(null);
  }

  if (profile) {
    return of(profile);
  }

  return store.dispatch(new LoadLoggedInUser(token));
};

const authorizeRoute = (
  store: Store,
  router: Router,
  requestedUrl: string,
  allowedRoles?: string[],
): boolean | UrlTree => {
  const isAuthenticated = store.selectSnapshot(AuthState.isAuthenticated);
  const token = store.selectSnapshot(AuthState.getToken);
  const profile = store.selectSnapshot(AuthState.getProfile);

  if (!isAuthenticated || !token || !profile) {
    return createLoginRedirect(router, requestedUrl);
  }

  if (allowedRoles?.length && !allowedRoles.includes(profile.role)) {
    return router.createUrlTree([getDashboardPath(profile) ?? '/home']);
  }

  return true;
};

const createLoginRedirect = (router: Router, returnUrl: string): UrlTree =>
  router.createUrlTree(['/auth/login'], {
    queryParams: { returnUrl },
  });

const getDashboardPath = (profile: AuthProfile): string | null => {
  const role = profile.role as DashboardRole;
  return dashboardRouteByRole[role] ?? null;
};
