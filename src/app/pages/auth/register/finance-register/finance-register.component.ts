import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { FormInputComponent } from '../../../../shared/form-input/form-input.component';

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
      return;
    }

    console.log('finance registration', this.registrationForm.getRawValue());
  }

  protected saveDraft(): void {
    console.log('finance draft', this.registrationForm.getRawValue());
  }
}
