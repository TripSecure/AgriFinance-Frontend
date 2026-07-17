import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../../../environment/environment';
import {
  OtpResponse,
  SigninCredentials,
  UserWithEmail,
  UserWithPhone,
  VerificationRequest,
} from './auth.state.model';

interface LoginResponse {
  message: string;
  code: number;
  isSuccessful: boolean;
  data: {
    expiry: string;
    token: string;
    lastLogin: string;
  };
  errors: any;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(private readonly http: HttpClient) {}

  signinWithUsername(user: SigninCredentials) {
    return this.http.post<LoginResponse>(
      `${environment.api}accounts/login`,
      user
    );
  }
  signinWithPhone(user: UserWithPhone) {
    return this.http.post<OtpResponse>(
      `${environment.api}accounts/login/phone`,
      user
    );
  }
  signinWithEmail(user: UserWithEmail) {
    return this.http.post<OtpResponse>(
      `${environment.api}accounts/login/email`,
      user
    );
  }

  verifyPhone(form: VerificationRequest) {
    return this.http.post<LoginResponse>(
      `${environment.api}accounts/verify/phone/otp`,
      form
    );
  }
  verifyEmail(form: VerificationRequest) {
    return this.http.post<LoginResponse>(
      `${environment.api}accounts/verify/email/otp`,
      form
    );
  }
}
