import { Signal } from '@angular/core';

// state/auth.state.model.ts
export interface AuthStateModel {
  isAuthenticated: boolean;
  token: string | null;
  userId: string | null;
  expiry: string | null;
  loading: boolean;
  requestId?: string | null;
  prefix?: string | null;
  lastLogin: string | null;
  errors: string[];
  message: string | null;
}
export interface VerifyStateModel {
  requestId: string;
  prefix: string;
  expiry: string | null;
  loading: boolean;
  errors: string[];
  message: string | null;
}

export const authInitialState: AuthStateModel = {
  isAuthenticated: false,
  token: null,
  userId: null,
  requestId: null,
  prefix: null,
  expiry: null,
  lastLogin: null,
  loading: false,
  errors: [],
  message: null,
};
export interface SigninCredentials {
  username: string;
  password: string;
}
export interface UserWithPhone {
  phoneNumber: string;
}

export interface UserWithEmail {
  email: string;
}
export interface VerificationRequest {
  requestId: any;
  prefix: any;
  code: string;
}

export interface LoginResponse {
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
export interface OtpResponse {
  message: string;
  code: number;
  isSuccessful: boolean;
  data: {
    requestId: string;
    prefix: string;
  };
  errors: any | null;
}
