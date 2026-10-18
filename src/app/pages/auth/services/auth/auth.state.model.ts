// state/auth.state.model.ts
export interface AuthStateModel {
  isAuthenticated: boolean;
  token: string | null;
  userId: string | null;
  currentUser: AuthUser | null;
  profile: AuthProfile | null;
  canAccessDashboard: boolean;
  expiry: string | null;
  loading: boolean;
  loginOtpRequested: boolean;
  loginOtp: LoginOtpChallenge | null;
  requestId?: string | null;
  prefix?: string | null;
  lastLogin: string | null;
  errors: string[];
  message: string | null;
  rememberDevice: boolean;
}
export interface AuthUser {
  id: string;
  phone: string | null;
  email: string | null;
}
export interface AuthProfile {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  role: string;
  status: string;
  phone_verification_status: string;
  email_verification_status: string;
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
  currentUser: null,
  profile: null,
  canAccessDashboard: false,
  requestId: null,
  prefix: null,
  expiry: null,
  lastLogin: null,
  loading: false,
  loginOtpRequested: false,
  loginOtp: null,
  errors: [],
  message: null,
  rememberDevice: false,
};

// What the backend said about the login code it issued. `bypass` (staging/local) includes the
// code and the login screen uses it automatically. `mock` (test SMS) and `live` (real SMS) make
// the user type the code they received.
export interface LoginOtpChallenge {
  mode: 'bypass' | 'mock' | 'live';
  phone: string | null;
  devCode: string | null;
  expiresAt: string | null;
}
export interface LoginOtpRequestCredentials {
  identity: string;
  password: string;
}
export interface LoginWithOtpCredentials extends LoginOtpRequestCredentials {
  otpCode?: string;
}

export interface ApiResponseBase {
  message: string;
  code?: number;
  success?: boolean;
  isSuccessful?: boolean;
  errors?: unknown;
  error?: unknown;
}

export interface LoginResponse extends ApiResponseBase {
  data: {
    expiry?: string;
    token?: string;
    accessToken?: string;
    refreshToken?: string;
    profile?: AuthProfile;
    nextStep?: string | null;
    lastLogin?: string;
  };
}
export interface CurrentSessionResponse extends ApiResponseBase {
  data: {
    user: AuthUser;
    profile: AuthProfile;
    canAccessDashboard: boolean;
  };
}
export interface OtpResponse extends ApiResponseBase {
  data: {
    requestId?: string;
    prefix?: string;
    phone?: string | null;
    expiresAt?: string | null;
    mode?: 'bypass' | 'mock' | 'live';
    devCode?: string;
  } | null;
}

export interface PasswordResetOtpPayload {
  identity: string;
}

export interface PasswordResetPayload {
  identity: string;
  otpCode: string;
  newPassword: string;
  confirmPassword?: string;
}

export interface PasswordResetResponse extends ApiResponseBase {
  data?: unknown;
}

