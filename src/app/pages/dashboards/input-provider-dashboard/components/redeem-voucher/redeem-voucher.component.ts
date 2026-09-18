import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngxs/store';
import { FormInputComponent } from '../../../../../shared/form-input/form-input.component';
import { extractErrorMessage } from '../../../../../shared/request.utils';
import { ToastrService } from '../../../../../shared/toastr/toastr.service';
import { ProviderOrdersState, RedeemVoucher } from '../orders/orders.state';

const parseProofLines = (value: string): string[] =>
  value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

@Component({
  selector: 'app-redeem-voucher',
  imports: [DecimalPipe, FormInputComponent, ReactiveFormsModule],
  templateUrl: './redeem-voucher.component.html',
  styleUrl: './redeem-voucher.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RedeemVoucherComponent {
  private readonly store = inject(Store);
  private readonly toastr = inject(ToastrService);

  protected readonly isRedeeming = this.store.selectSignal(ProviderOrdersState.isRedeeming);
  protected readonly redeemResult = this.store.selectSignal(ProviderOrdersState.redeemResult);
  protected readonly redeemErrors = this.store.selectSignal(ProviderOrdersState.redeemErrors);

  protected readonly redeemForm = new FormGroup({
    qrPayload: new FormControl('', { nonNullable: true, validators: Validators.required }),
    deliveryNotes: new FormControl('', { nonNullable: true }),
    proofOfDelivery: new FormControl('', { nonNullable: true }),
  });

  protected onSubmit(): void {
    if (this.redeemForm.invalid) {
      this.redeemForm.markAllAsTouched();
      return;
    }

    const raw = this.redeemForm.getRawValue();
    this.store
      .dispatch(
        new RedeemVoucher({
          qrPayload: raw.qrPayload.trim(),
          deliveryNotes: raw.deliveryNotes.trim() || null,
          proofOfDelivery: parseProofLines(raw.proofOfDelivery),
        }),
      )
      .subscribe({
        next: () => {
          const errors = this.store.selectSnapshot(ProviderOrdersState.redeemErrors);
          if (errors.length) {
            this.toastr.triggerToastr('error', errors[0]);
            return;
          }

          this.toastr.triggerToastr('success', 'Voucher scanned and submitted for portfolio officer review.');
          this.redeemForm.reset({ qrPayload: '', deliveryNotes: '', proofOfDelivery: '' });
        },
        error: (error: unknown) =>
          this.toastr.triggerToastr('error', extractErrorMessage(error, 'Unable to redeem this voucher.')),
      });
  }

  protected formatLabel(value: string | null | undefined): string {
    return (
      (value ?? '')
        .replace(/[_-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (letter) => letter.toUpperCase()) || '-'
    );
  }
}
