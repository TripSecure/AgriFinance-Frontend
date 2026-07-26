import { Injectable, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export type Type = 'success' | 'error' | 'info';

export interface Alert {
  type: Type;
  message: string;
  delay: number;
}

@Injectable({
  providedIn: 'root',
})
export class ToastrService {
  private readonly toastrSubject = new Subject<Alert | null>();
  private readonly toastrObservable = this.toastrSubject.asObservable();
  private dismissTimeout: ReturnType<typeof setTimeout> | null = null;
  public isLoading = signal(false);

  get toastr(): Observable<Alert | null> {
    return this.toastrObservable;
  }

  triggerToastr(type: Type, message: string, delay = 4000): void {
    this.clearDismissTimeout();
    this.toastrSubject.next({ type, message, delay });

    if (delay > 0) {
      this.dismissTimeout = setTimeout(() => this.dismiss(), delay);
    }
  }

  dismiss(): void {
    this.clearDismissTimeout();
    this.toastrSubject.next(null);
  }

  public IsLoading(): void {
    this.isLoading.set(true);
  }

  public IsDone(): void {
    this.isLoading.set(false);
    this.dismiss();
  }

  private clearDismissTimeout(): void {
    if (this.dismissTimeout) {
      clearTimeout(this.dismissTimeout);
      this.dismissTimeout = null;
    }
  }
}
