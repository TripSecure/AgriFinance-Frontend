import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { FormInputComponent } from '../../../../shared/form-input/form-input.component';

type FileControlValue = File[];

type FinancePartnerRegistrationControls = {
  institutionName: FormControl<string>;
  bankLicenseNumber: FormControl<string>;
  tin: FormControl<string>;
  headOfficeAddress: FormControl<string>;
  contactOfficerName: FormControl<string>;
  roleDesignation: FormControl<string>;
  phone: FormControl<string>;
  email: FormControl<string>;
  licenseCertificate: FormControl<FileControlValue>;
  authorisationLetter: FormControl<FileControlValue>;
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
  protected readonly registrationForm = new FormGroup<FinancePartnerRegistrationControls>({
    institutionName: new FormControl('', { nonNullable: true, validators: Validators.required }),
    bankLicenseNumber: new FormControl('', {
      nonNullable: true,
      validators: Validators.required,
    }),
    tin: new FormControl('', {
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
    phone: new FormControl('', { nonNullable: true, validators: Validators.required }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    licenseCertificate: new FormControl<FileControlValue>([], {
      nonNullable: true,
      validators: Validators.required,
    }),
    authorisationLetter: new FormControl<FileControlValue>([], {
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
