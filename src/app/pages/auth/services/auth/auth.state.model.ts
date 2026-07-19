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
  requestId?: string | null;
  prefix?: string | null;
  lastLogin: string | null;
  errors: string[];
  message: string | null;
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
  errors: [],
  message: null,
};
export interface SigninCredentials {
  username: string;
  password: string;
}
export interface LoginOtpRequestCredentials {
  identity: string;
  password: string;
}
export interface LoginWithOtpCredentials extends LoginOtpRequestCredentials {
  otpCode: string;
}
export interface UserWithPhone {
  phoneNumber: string;
}

export interface UserWithEmail {
  email: string;
}
export interface VerificationRequest {
  requestId: string;
  prefix: string;
  code: string;
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
    requestId: string;
    prefix: string;
  } | null;
}
