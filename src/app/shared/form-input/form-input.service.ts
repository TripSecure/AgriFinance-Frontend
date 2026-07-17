import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environment/environment';

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
  

}