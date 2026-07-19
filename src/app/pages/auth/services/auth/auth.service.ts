import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../../environment/environment';
import {
  CurrentSessionResponse,
  LoginOtpRequestCredentials,
  LoginResponse,
  LoginWithOtpCredentials,
  OtpResponse,
  SigninCredentials,
  UserWithEmail,
  UserWithPhone,
  VerificationRequest,
} from './auth.state.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);

  requestLoginOtp(credentials: LoginOtpRequestCredentials) {
    return this.http.post<OtpResponse>(`${environment.api}/auth/login/request-otp`, credentials);
  }

  login(credentials: LoginWithOtpCredentials) {
    return this.http.post<LoginResponse>(`${environment.api}/auth/login`, credentials);
  }

  loadLoggedInUser(accessToken?: string) {
    return this.http.get<CurrentSessionResponse>(`${environment.api}/auth/me`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    });
  }

  signinWithUsername(user: SigninCredentials) {
    return this.http.post<LoginResponse>(`${environment.api}accounts/login`, user);
  }
  signinWithPhone(user: UserWithPhone) {
    return this.http.post<OtpResponse>(`${environment.api}accounts/login/phone`, user);
  }
  signinWithEmail(user: UserWithEmail) {
    return this.http.post<OtpResponse>(`${environment.api}accounts/login/email`, user);
  }

  verifyPhone(form: VerificationRequest) {
    return this.http.post<LoginResponse>(`${environment.api}accounts/verify/phone/otp`, form);
  }
  verifyEmail(form: VerificationRequest) {
    return this.http.post<LoginResponse>(`${environment.api}accounts/verify/email/otp`, form);
  }
}
