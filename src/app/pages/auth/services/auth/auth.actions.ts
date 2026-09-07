import { LoginOtpRequestCredentials, LoginWithOtpCredentials } from './auth.state.model';

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

export class Logout {
  static readonly type = '[Auth] Logout';
}

// For forgot password / request OTP
export class RequestPasswordResetOtp {
  static readonly type = '[Auth] Request Password Reset OTP';
  constructor(public payload: { identity: string }) {}
}

// For reset password
export class ResetPassword {
  static readonly type = '[Auth] Reset Password';
  constructor(
    public payload: {
      identity: string;
      otpCode: string;
      newPassword: string;
      confirmPassword?: string;
    },
  ) {}
}

//Persisting the state
export class PersistState {
  static readonly type = '[Auth] Persist State';
}

export class SetRememberDevice {
  static readonly type = '[Auth] Set Remember Device';
  constructor(public rememberDevice: boolean) {}
}
