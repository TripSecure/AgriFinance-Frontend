import {
  LoginOtpRequestCredentials,
  LoginWithOtpCredentials,
  SigninCredentials,
  UserWithEmail,
  UserWithPhone,
  VerificationRequest,
} from './auth.state.model';

export class AuthAction {
  static readonly type = '[Auth] Add item';
  constructor(readonly payload: string) {}
}

export class RequestLoginOtp {
  static readonly type = '[Auth] Request Login OTP';
  constructor(public payload: LoginOtpRequestCredentials) {}
}

export class LoginWithOtp {
  static readonly type = '[Auth] Login With OTP';
  constructor(public payload: LoginWithOtpCredentials) {}
}

export class ResetLoginOtpRequest {
  static readonly type = '[Auth] Reset Login OTP Request';
}

export class LoadLoggedInUser {
  static readonly type = '[Auth] Load Logged In User';
  constructor(public accessToken?: string) {}
}

export class LoginWithUsername {
  static readonly type = '[Auth] Login With Username';
  constructor(public payload: SigninCredentials) {}
}
export class LoginWithEmail {
  static readonly type = '[Auth] Login With Email';
  constructor(public payload: UserWithEmail) {}
}
export class LoginWithPhone {
  static readonly type = '[Auth] Login With Phone';
  constructor(public payload: UserWithPhone) {}
}
export class VerificationPhone {
  static readonly type = '[Auth] Verify Phone';
  constructor(public payload: VerificationRequest) {}
}

export class VerificationEmail {
  static readonly type = '[Auth] Verify Email';
  constructor(public payload: VerificationRequest) {}
}

export class Logout {
  static readonly type = '[Auth] Logout';
}

// For forgot password
export class ForgotPassword {
  static readonly type = '[Auth] Forgot Password';
  constructor(public email: string) {}
}

// For reset password
export class ResetPassword {
  static readonly type = '[Auth] Reset Password';
  constructor(
    public token: string,
    public newPassword: string,
  ) {}
}

//Persisting the state
export class PersistState {
  static readonly type = '[Auth] Persist State';
}
