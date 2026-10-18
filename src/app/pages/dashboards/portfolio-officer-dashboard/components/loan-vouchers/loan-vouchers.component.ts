import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngxs/store';
import QRCode from 'qrcode';
import { FormInputComponent } from '../../../../../shared/form-input/form-input.component';
import { ToastrService } from '../../../../../shared/toastr/toastr.service';
import {
  AssignVoucher,
  GetLoanVouchers,
  GetVoucherProviders,
  LoanVoucher,
  LoanVouchersState,
  ResendVoucherSms,
} from './loan-vouchers.state';

const serviceLabels: Record<string, string> = {
  agrochemicals: 'Agrochemicals',
  soil_testing: 'Soil testing',
  tractor_services: 'Tractor services',
  irrigation_and_water_support: 'Irrigation & water',
  logistics_and_aggregation: 'Logistics & aggregation',
};

const providerKindLabels: Record<string, string> = {
  input_provider: 'input providers',
  soil_testing_provider: 'soil testing providers',
  tractor_provider: 'tractor providers',
  irrigation_provider: 'irrigation providers',
  logistics_provider: 'logistics providers',
};

const voucherStatusLabels: Record<string, string> = {
  generated: 'Open',
  assigned: 'Assigned',
  redeemed: 'Redeemed',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

const orderStatusLabels: Record<string, string> = {
  pending: 'Waiting for the provider to accept',
  accepted: 'Accepted by the provider',
  in_transit: 'On the way',
  pending_review: 'Delivered, waiting for your review',
  delivered: 'Delivered and approved',
  rejected: 'Sent back to the provider',
};

@Component({
  selector: 'app-loan-vouchers',
  imports: [DatePipe, DecimalPipe, FormInputComponent, ReactiveFormsModule],
  templateUrl: './loan-vouchers.component.html',
  styleUrl: './loan-vouchers.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoanVouchersComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly toastr = inject(ToastrService);

  readonly loanId = input.required<string>();

  protected readonly vouchers = this.store.selectSignal(LoanVouchersState.vouchers);
  protected readonly loan = this.store.selectSignal(LoanVouchersState.loan);
  protected readonly isLoading = this.store.selectSignal(LoanVouchersState.isLoading);
  protected readonly providers = this.store.selectSignal(LoanVouchersState.providers);
  protected readonly isProvidersLoading = this.store.selectSignal(LoanVouchersState.isProvidersLoading);
  protected readonly isAssigning = this.store.selectSignal(LoanVouchersState.isAssigning);
  protected readonly sendingSmsVoucherId = this.store.selectSignal(LoanVouchersState.sendingSmsVoucherId);

  protected readonly assigningVoucherId = signal<string | null>(null);
  protected readonly qrVoucherId = signal<string | null>(null);
  protected readonly qrImages = signal<Record<string, string>>({});

  protected readonly openCount = computed(() => this.vouchers().filter((voucher) => voucher.status === 'generated').length);

  protected readonly assignForm = new FormGroup({
    providerId: new FormControl('', { nonNullable: true, validators: Validators.required }),
  });

  ngOnInit(): void {
    this.store.dispatch(new GetLoanVouchers(this.loanId())).subscribe(() => this.toastFirstError());
  }

  protected serviceLabel(service: string): string {
    return serviceLabels[service] ?? service.replace(/_/g, ' ');
  }

  protected providerKind(role: string | null): string {
    return (role && providerKindLabels[role]) || 'providers';
  }

  protected providerKindSingular(role: string | null): string {
    return this.providerKind(role).replace(/s$/, '');
  }

  protected loanStatusLabel(): string {
    return (this.loan().status ?? 'not submitted').replace(/_/g, ' ');
  }

  protected voucherStatusLabel(status: string): string {
    return voucherStatusLabels[status] ?? status;
  }

  protected orderStatusLabel(status: string): string {
    return orderStatusLabels[status] ?? status.replace(/_/g, ' ');
  }

  protected onStartAssign(voucher: LoanVoucher): void {
    this.assigningVoucherId.set(voucher.id);
    this.assignForm.reset({ providerId: '' });
    this.store.dispatch(new GetVoucherProviders(voucher.id)).subscribe(() => this.toastFirstError());
  }

  protected onCancelAssign(): void {
    this.assigningVoucherId.set(null);
  }

  protected onConfirmAssign(voucher: LoanVoucher): void {
    if (this.assignForm.invalid) {
      this.assignForm.markAllAsTouched();
      return;
    }

    const providerId = this.assignForm.controls.providerId.value;
    const providerName = this.providers().find((provider) => provider.id === providerId)?.name ?? 'the provider';
    this.store.dispatch(new AssignVoucher(voucher.id, providerId)).subscribe(() => {
      if (this.toastFirstError()) {
        return;
      }

      this.assigningVoucherId.set(null);
      this.toastr.triggerToastr('success', `Voucher sent to ${providerName}. It is now on their order list.`);
    });
  }

  protected onSendSms(voucher: LoanVoucher): void {
    this.store.dispatch(new ResendVoucherSms(voucher.id)).subscribe(() => {
      if (this.toastFirstError()) {
        return;
      }
      this.toastr.triggerToastr('success', `Voucher code ${voucher.voucherCode} texted to the farmer.`);
    });
  }

  protected onToggleQr(voucher: LoanVoucher): void {
    if (this.qrVoucherId() === voucher.id) {
      this.qrVoucherId.set(null);
      return;
    }

    this.qrVoucherId.set(voucher.id);
    if (this.qrImages()[voucher.id]) {
      return;
    }

    QRCode.toDataURL(voucher.qrPayload, { width: 220, margin: 1, errorCorrectionLevel: 'M' })
      .then((url) => this.qrImages.update((images) => ({ ...images, [voucher.id]: url })))
      .catch(() => this.toastr.triggerToastr('error', 'Unable to draw the QR code for this voucher.'));
  }

  protected onPrint(voucher: LoanVoucher): void {
    const image = this.qrImages()[voucher.id];
    const printWindow = window.open('', '_blank', 'width=420,height=640');
    if (!printWindow) {
      this.toastr.triggerToastr('error', 'Allow pop-ups to print the voucher.');
      return;
    }

    // Built with DOM nodes rather than an HTML string so names and codes are never parsed as markup.
    const doc = printWindow.document;
    doc.title = `Voucher ${voucher.voucherCode}`;
    const style = doc.createElement('style');
    style.textContent =
      'body{font-family:system-ui,sans-serif;text-align:center;padding:24px;color:#101828}' +
      'h1{font-size:18px;margin:0 0 4px}p{margin:4px 0}.code{font-size:24px;font-weight:700;letter-spacing:2px;margin:12px 0}' +
      '.muted{color:#667085;font-size:13px}img{margin:12px auto;display:block}';
    doc.head.append(style);

    const lines: Array<[string, string?]> = [
      ['TripSecure input voucher', 'h1'],
      [this.loan().farmerName ?? '', 'p'],
      [`${this.serviceLabel(voucher.service)} - GHS ${voucher.amountGhs.toFixed(2)}`, 'p'],
    ];
    for (const [text, tag] of lines) {
      const element = doc.createElement(tag ?? 'p');
      element.textContent = text;
      doc.body.append(element);
    }

    if (image) {
      const img = doc.createElement('img');
      img.src = image;
      img.alt = `QR code for voucher ${voucher.voucherCode}`;
      img.width = 220;
      doc.body.append(img);
    }

    const code = doc.createElement('p');
    code.className = 'code';
    code.textContent = voucher.voucherCode;
    doc.body.append(code);

    const footer = doc.createElement('p');
    footer.className = 'muted';
    footer.textContent = voucher.expiresAt
      ? `Valid until ${new Date(voucher.expiresAt).toLocaleDateString()}. Show this at an approved provider.`
      : 'Show this at an approved provider.';
    doc.body.append(footer);

    printWindow.focus();
    printWindow.print();
  }

  protected onCopyCode(voucher: LoanVoucher): void {
    navigator.clipboard
      ?.writeText(voucher.voucherCode)
      .then(() => this.toastr.triggerToastr('success', 'Voucher code copied.'))
      .catch(() => this.toastr.triggerToastr('error', 'Unable to copy the code.'));
  }

  private toastFirstError(): boolean {
    const errors = this.store.selectSnapshot(LoanVouchersState.errors);
    if (errors.length) {
      this.toastr.triggerToastr('error', errors[0]);
      return true;
    }
    return false;
  }
}
