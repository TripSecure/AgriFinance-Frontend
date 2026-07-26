import { AsyncPipe, NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Alert, ToastrService, Type } from './toastr.service';

@Component({
  selector: 'app-toastr',
  imports: [AsyncPipe, NgOptimizedImage],
  templateUrl: './toastr.component.html',
  styleUrl: './toastr.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastrComponent {
  private readonly toastrService = inject(ToastrService);
  public readonly toastr$: Observable<Alert | null> = this.toastrService.toastr;

  protected readonly toastIconByType: Record<Type, string> = {
    success: '/images/success_toastr1.svg',
    error: '/images/failed_toastr.svg',
    info: '/images/info_toastr.svg',
  };

  onClose(): void {
    this.toastrService.dismiss();
  }
}
