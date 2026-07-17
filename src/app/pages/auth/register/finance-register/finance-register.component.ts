import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';
import { FormInputComponent } from '../../../../shared/form-input/form-input.component';
import { SubmitRegistration } from '../services/registration.actions';
import { getInvalidControlLabels } from '../services/registration-form-validation';
import { RegistrationState } from '../services/registration.state';
import { BankRegistrationPayload } from '../services/registration.state.model';

type FinancePartnerRegistrationControls = {
  institutionName: FormControl<string>;
  bankLicenseNumber: FormControl<string>;
  tinNumber: FormControl<string>;
  headOfficeAddress: FormControl<string>;
  contactOfficerName: FormControl<string>;
  roleDesignation: FormControl<string>;
  phoneNumber: FormControl<string>;
  emailAddress: FormControl<string>;
  password: FormControl<string>;
  licenseCertificate: FormControl<string>;
  authorizationLetter: FormControl<string>;
};

@Component({
  selector: 'app-finance-register',
  imports: [FormInputComponent, ReactiveFormsModule, RouterLink, MatIconModule],
  templateUrl: './finance-register.component.html',
  styleUrl: './finance-register.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinanceRegisterComponent {
  private readonly store = inject(Store);

  protected readonly registrationLoading = this.store.selectSignal(RegistrationState.isLoading);
  protected readonly registrationMessage = this.store.selectSignal(RegistrationState.message);
  protected readonly registrationErrors = this.store.selectSignal(RegistrationState.errors);
  protected readonly localSubmitError = signal<string | null>(null);

  protected readonly pageTitle = 'Finance Partner Registration';
  protected readonly uploadRole = 'bank';
  protected readonly registrationForm = new FormGroup<FinancePartnerRegistrationControls>({
    institutionName: new FormControl('', { nonNullable: true, validators: Validators.required }),
    bankLicenseNumber: new FormControl('', {
      nonNullable: true,
      validators: Validators.required,
    }),
    tinNumber: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d{9}$/)],
    }),
    headOfficeAddress: new FormControl('', {
      nonNullable: true,
      validators: Validators.required,
    }),
    contactOfficerName: new FormControl('', {
      nonNullable: true,
      validators: Validators.required,
    }),
    roleDesignation: new FormControl('', {
      nonNullable: true,
      validators: Validators.required,
    }),
    phoneNumber: new FormControl('', { nonNullable: true, validators: Validators.required }),
    emailAddress: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(12)],
    }),
    licenseCertificate: new FormControl('', {
      nonNullable: true,
      validators: Validators.required,
    }),
    authorizationLetter: new FormControl('', {
      nonNullable: true,
      validators: Validators.required,
    }),
  });

  protected onSubmit(): void {
    this.registrationForm.markAllAsTouched();

    if (this.registrationForm.invalid) {
      this.localSubmitError.set(this.getInvalidFormMessage());
      return;
    }

    this.localSubmitError.set(null);
    this.store.dispatch(new SubmitRegistration(this.buildPayload())).subscribe();
  }

  protected saveDraft(): void {
    console.log('finance draft', this.registrationForm.getRawValue());
  }

  private buildPayload(): BankRegistrationPayload {
    const value = this.registrationForm.getRawValue();

    return {
      role: 'bank',
      password: value.password,
      submitForReview: true,
      institutionDetails: {
        institutionName: value.institutionName,
        bankLicenseNumber: value.bankLicenseNumber,
        tinNumber: value.tinNumber,
        headOfficeAddress: value.headOfficeAddress,
      },
      contactOfficerInformation: {
        contactOfficerName: value.contactOfficerName,
        roleDesignation: value.roleDesignation,
        phoneNumber: value.phoneNumber,
        emailAddress: value.emailAddress,
      },
      documentUpload: {
        licenseCertificate: value.licenseCertificate,
        authorizationLetter: value.authorizationLetter,
      },
    };
  }

  private getInvalidFormMessage(): string {
    const invalidFields = getInvalidControlLabels(this.registrationForm);
    const visibleFields = invalidFields.slice(0, 6);
    const remainingCount = invalidFields.length - visibleFields.length;
    const remainingMessage = remainingCount > 0 ? ` and ${remainingCount} more` : '';

    return `Please complete: ${visibleFields.join(', ')}${remainingMessage}.`;
  }
}
