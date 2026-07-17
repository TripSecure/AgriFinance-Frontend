import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment';

export type KycDocumentUploadResponse = {
  success: boolean;
  message: string;
  data: {
    path: string;
  };
};

@Injectable({
  providedIn: 'root',
})
export class KycDocumentUploadService {
  private readonly http = inject(HttpClient);

  uploadDocument(
    file: File,
    documentType: string,
    role: string,
  ): Observable<KycDocumentUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);
    formData.append('role', role);

    return this.http.post<KycDocumentUploadResponse>(
      `${environment.api}/uploads/kyc-document`,
      formData,
    );
  }
}
