import { RegistrationPayload } from './registration.state.model';

export class SubmitRegistration {
  static readonly type = '[Registration] Submit';
  constructor(public readonly payload: RegistrationPayload) {}
}

export class ResetRegistrationState {
  static readonly type = '[Registration] Reset';
}
