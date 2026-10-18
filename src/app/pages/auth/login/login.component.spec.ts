import { WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Store } from '@ngxs/store';
import { of } from 'rxjs';
import { ToastrService } from '../../../shared/toastr/toastr.service';
import { LoginWithOtp, RequestLoginOtp } from '../services/auth/auth.actions';
import { LoginOtpChallenge } from '../services/auth/auth.state.model';
import { AuthState } from '../services/auth/auth.states';
import { LoginComponent } from './login.component';

// A stand-in store that answers the login code request the way each backend environment does.
const createStore = (challenge: LoginOtpChallenge) => {
  const values = new Map<unknown, WritableSignal<unknown>>([
    [AuthState.isLoading, signal(false)],
    [AuthState.getErrors, signal<string[]>([])],
    [AuthState.message, signal<string | null>(null)],
    [AuthState.loginOtp, signal<LoginOtpChallenge | null>(null)],
    [AuthState.isAuthenticated, signal(false)],
  ]);
  const dispatched: unknown[] = [];

  return {
    dispatched,
    selectSignal: (selector: unknown) => values.get(selector) ?? signal(null),
    selectSnapshot: (selector: unknown) => values.get(selector)?.() ?? null,
    dispatch: (actions: unknown) => {
      for (const action of Array.isArray(actions) ? actions : [actions]) {
        dispatched.push(action);
        if (action instanceof RequestLoginOtp) values.get(AuthState.loginOtp)!.set(challenge);
        if (action instanceof LoginWithOtp) values.get(AuthState.isAuthenticated)!.set(true);
      }
      return of(undefined);
    },
  };
};

const setup = async (challenge: LoginOtpChallenge) => {
  const store = createStore(challenge);
  await TestBed.configureTestingModule({
    imports: [LoginComponent],
    providers: [
      provideRouter([]),
      { provide: Store, useValue: store },
      { provide: ToastrService, useValue: { triggerToastr: () => undefined } },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(LoginComponent);
  const router = TestBed.inject(Router);
  const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  fixture.detectChanges();

  const component = fixture.componentInstance as unknown as {
    loginForm: { patchValue: (value: Record<string, string>) => void };
    signIn: () => void;
    step: () => string;
    loginHelpText: () => string;
  };
  component.loginForm.patchValue({ identity: 'superadmin@tripsecure.local', password: 'secret-password' });

  return { component, fixture, store, navigate };
};

const loginCodes = (store: ReturnType<typeof createStore>) =>
  store.dispatched.filter((action): action is LoginWithOtp => action instanceof LoginWithOtp).map((action) => action.payload.otpCode);

describe('LoginComponent', () => {
  it('signs in straight away when the backend bypasses the code (staging and local)', async () => {
    const { component, store, navigate } = await setup({ mode: 'bypass', phone: '+233240387717', devCode: '000000', expiresAt: null });

    component.signIn();

    expect(store.dispatched.some((action) => action instanceof RequestLoginOtp)).toBe(true);
    expect(loginCodes(store)).toEqual(['000000']);
    expect(navigate).toHaveBeenCalledWith('/dashboard');
  });

  it('asks for the texted code when the backend sends a real SMS (production)', async () => {
    const { component, fixture, store, navigate } = await setup({ mode: 'live', phone: '+233240387717', devCode: null, expiresAt: null });

    component.signIn();
    fixture.detectChanges();

    expect(component.step()).toBe('code');
    expect(component.loginHelpText()).toContain('ending 7717');
    expect(loginCodes(store)).toEqual([]);
    expect(navigate).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('#login-otp')).not.toBeNull();

    component.loginForm.patchValue({ otpCode: '482913' });
    component.signIn();

    expect(loginCodes(store)).toEqual(['482913']);
    expect(navigate).toHaveBeenCalledWith('/dashboard');
  });

  it('still asks for the code in mock SMS mode, even though the backend returns it', async () => {
    const { component, store } = await setup({ mode: 'mock', phone: '+233240387717', devCode: '654321', expiresAt: null });

    component.signIn();

    expect(component.step()).toBe('code');
    expect(loginCodes(store)).toEqual([]);
  });

  it('does not submit a code that is not 6 digits', async () => {
    const { component, store } = await setup({ mode: 'live', phone: '+233240387717', devCode: null, expiresAt: null });

    component.signIn();
    component.loginForm.patchValue({ otpCode: '12' });
    component.signIn();

    expect(loginCodes(store)).toEqual([]);
  });
});
