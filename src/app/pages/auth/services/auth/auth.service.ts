import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../../environment/environment';
import {
  ApiResponseBase,
  CurrentSessionResponse,
  LoginOtpRequestCredentials,
  LoginResponse,
  LoginWithOtpCredentials,
  OtpResponse,
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

  requestPasswordResetOtp(payload: { identity: string }) {
    return this.http.post<OtpResponse>(`${environment.api}/auth/password/request-otp`, payload);
  }

  resetPassword(payload: { identity: string; otpCode?: string; otp?: string; newPassword: string; confirmPassword?: string }) {
    const body = {
      identity: payload.identity,
      otp: payload.otpCode || payload.otp || '',
      otpCode: payload.otpCode || payload.otp || '',
      newPassword: payload.newPassword,
      confirmPassword: payload.confirmPassword || payload.newPassword,
    };
    return this.http.post<ApiResponseBase>(`${environment.api}/auth/password/reset`, body);
  }
}
