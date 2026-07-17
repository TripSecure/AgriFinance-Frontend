import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';
import { FormInputComponent } from '../../../../shared/form-input/form-input.component';
import { SubmitRegistration } from '../services/registration.actions';
import { getInvalidControlLabels } from '../services/registration-form-validation';
import { RegistrationState } from '../services/registration.state';
import { ExtensionOfficerRegistrationPayload } from '../services/registration.state.model';

type DocumentUploadControls = {
  nationalIdFront: FormControl<string>;
  nationalIdBack: FormControl<string>;
  passportPhoto: FormControl<string>;
};

type RoleRegistrationControls = {
  fullName: FormControl<string>;
  dateOfBirth: FormControl<string>;
  nationalIdNumber: FormControl<string>;
  phone: FormControl<string>;
  email: FormControl<string>;
  password: FormControl<string>;
  staffId: FormControl<string>;
  regionDistrict: FormControl<string>;
  supervisorName: FormControl<string>;
  documentUpload: FormGroup<DocumentUploadControls>;
};

@Component({
  selector: 'app-extension-register',
  imports: [FormInputComponent, ReactiveFormsModule, RouterLink, MatIconModule],
  templateUrl: './extension-register.component.html',
  styleUrl: '../register.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExtensionRegisterComponent {
  private readonly store = inject(Store);

  protected readonly registrationLoading = this.store.selectSignal(RegistrationState.isLoading);
  protected readonly registrationMessage = this.store.selectSignal(RegistrationState.message);
  protected readonly registrationErrors = this.store.selectSignal(RegistrationState.errors);
  protected readonly localSubmitError = signal<string | null>(null);

  protected readonly pageTitle = 'Extension Officer Registration';
  protected readonly uploadRole = 'extension_officer';
  protected readonly regionDistricts = [
    'Accra Metropolitan',
    'Kumasi Metropolitan',
    'Tamale Metropolitan',
  ];
  protected readonly registrationForm = new FormGroup<RoleRegistrationControls>({
    fullName: new FormControl('', { nonNullable: true, validators: Validators.required }),
    dateOfBirth: new FormControl('', { nonNullable: true, validators: Validators.required }),
    nationalIdNumber: new FormControl('', { nonNullable: true, validators: Validators.required }),
    phone: new FormControl('', { nonNullable: true, validators: Validators.required }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(12)],
    }),
    staffId: new FormControl('', { nonNullable: true, validators: Validators.required }),
    regionDistrict: new FormControl('Accra Metropolitan', {
      nonNullable: true,
      validators: Validators.required,
    }),
    supervisorName: new FormControl('', { nonNullable: true, validators: Validators.required }),
    documentUpload: new FormGroup<DocumentUploadControls>({
      nationalIdFront: new FormControl('', {
        nonNullable: true,
        validators: Validators.required,
      }),
      nationalIdBack: new FormControl('', {
        nonNullable: true,
        validators: Validators.required,
      }),
      passportPhoto: new FormControl('', {
        nonNullable: true,
        validators: Validators.required,
      }),
    }),
  });
  protected readonly documentUploadForm = this.registrationForm.controls.documentUpload;

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
    console.log('extension draft', this.registrationForm.getRawValue());
  }

  private buildPayload(): ExtensionOfficerRegistrationPayload {
    const value = this.registrationForm.getRawValue();

    return {
      role: 'extension_officer',
      password: value.password,
      submitForReview: true,
      personalInformation: {
        fullName: value.fullName,
        dateOfBirth: value.dateOfBirth,
        nationalIdNumber: value.nationalIdNumber,
        phone: value.phone,
        email: value.email,
      },
      employmentDetails: {
        staffId: value.staffId,
        regionDistrict: value.regionDistrict,
        supervisorName: value.supervisorName,
      },
      documentUpload: value.documentUpload,
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
