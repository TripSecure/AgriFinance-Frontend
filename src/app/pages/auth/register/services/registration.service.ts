import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environment/environment';
import { RegistrationApiResponse, RegistrationPayload } from './registration.state.model';

@Injectable({
  providedIn: 'root',
})
export class RegistrationService {
  private readonly http = inject(HttpClient);

  completeRegistration(payload: RegistrationPayload): Observable<RegistrationApiResponse> {
    return this.http.post<RegistrationApiResponse>(
      `${environment.api}/auth/complete-registration`,
      payload,
    );
  }
}
