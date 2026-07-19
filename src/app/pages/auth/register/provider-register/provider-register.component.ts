import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';
import { FormInputComponent } from '../../../../shared/form-input/form-input.component';
import { SubmitRegistration } from '../services/registration.actions';
import { getInvalidControlLabels } from '../services/registration-form-validation';
import { RegistrationState } from '../services/registration.state';
import {
  ProviderRegistrationPayload,
  ProviderServiceType,
} from '../services/registration.state.model';

type ProviderRegistrationControls = {
  businessName: FormControl<string>;
  registrationNumber: FormControl<string>;
  tinNumber: FormControl<string>;
  businessAddress: FormControl<string>;
  contactPerson: FormControl<string>;
  phoneNumber: FormControl<string>;
  emailAddress: FormControl<string>;
  password: FormControl<string>;
  serviceTypes: FormControl<ProviderServiceType[]>;
  operationalJurisdictions: FormControl<string[]>;
  businessRegistrationCertificate: FormControl<string>;
  tinCertificate: FormControl<string>;
  directorIdFront: FormControl<string>;
  portraitPhoto: FormControl<string>;
};

@Component({
  selector: 'app-provider-register',
  imports: [FormInputComponent, ReactiveFormsModule, RouterLink, MatIconModule],
  templateUrl: './provider-register.component.html',
  styleUrl: '../register.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProviderRegisterComponent {
  private readonly store = inject(Store);
  private readonly router = inject(Router);

  protected readonly registrationLoading = this.store.selectSignal(RegistrationState.isLoading);
  protected readonly registrationMessage = this.store.selectSignal(RegistrationState.message);
  protected readonly registrationErrors = this.store.selectSignal(RegistrationState.errors);
  protected readonly localSubmitError = signal<string | null>(null);

  protected readonly pageTitle = 'Input Service Provider Registration';
  protected readonly uploadRole = 'input_provider';
  protected readonly serviceTypeOptions: Array<{ value: ProviderServiceType; label: string }> = [
    { value: 'tractor_services', label: 'Tractor Services' },
    { value: 'irrigation_services', label: 'Irrigation Services' },
    { value: 'agrochemicals', label: 'Agrochemicals' },
    { value: 'soil_testing', label: 'Soil Testing' },
    { value: 'logistics_aggregation', label: 'Logistics & Aggregation' },
  ];
  protected readonly operationalJurisdictionOptions = [
    'Accra Metropolitan',
    'Kumasi Metropolitan',
    'Tamale Metropolitan',
  ];
  protected readonly registrationForm = new FormGroup<ProviderRegistrationControls>({
    businessName: new FormControl('', { nonNullable: true, validators: Validators.required }),
    registrationNumber: new FormControl('', { nonNullable: true, validators: Validators.required }),
    tinNumber: new FormControl('', { nonNullable: true, validators: Validators.required }),
    businessAddress: new FormControl('', { nonNullable: true, validators: Validators.required }),
    contactPerson: new FormControl('', { nonNullable: true, validators: Validators.required }),
    phoneNumber: new FormControl('', { nonNullable: true, validators: Validators.required }),
    emailAddress: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(12)],
    }),
    serviceTypes: new FormControl<ProviderServiceType[]>([], {
      nonNullable: true,
      validators: Validators.required,
    }),
    operationalJurisdictions: new FormControl<string[]>([], {
      nonNullable: true,
      validators: Validators.required,
    }),
    businessRegistrationCertificate: new FormControl('', {
      nonNullable: true,
      validators: Validators.required,
    }),
    tinCertificate: new FormControl('', {
      nonNullable: true,
      validators: Validators.required,
    }),
    directorIdFront: new FormControl('', {
      nonNullable: true,
      validators: Validators.required,
    }),
    portraitPhoto: new FormControl('', {
      nonNullable: true,
      validators: Validators.required,
    }),
  });

  protected isServiceTypeSelected(value: ProviderServiceType): boolean {
    return this.registrationForm.controls.serviceTypes.value.includes(value);
  }

  protected onServiceTypeChange(value: ProviderServiceType, event: Event): void {
    const checked = event.target instanceof HTMLInputElement && event.target.checked;
    const control = this.registrationForm.controls.serviceTypes;
    const current = control.value;
    control.setValue(checked ? [...current, value] : current.filter((item) => item !== value));
    control.markAsDirty();
    control.markAsTouched();
  }

  protected isOperationalJurisdictionSelected(value: string): boolean {
    return this.registrationForm.controls.operationalJurisdictions.value.includes(value);
  }

  protected onOperationalJurisdictionChange(value: string, event: Event): void {
    const checked = event.target instanceof HTMLInputElement && event.target.checked;
    const control = this.registrationForm.controls.operationalJurisdictions;
    const current = control.value;
    control.setValue(checked ? [...current, value] : current.filter((item) => item !== value));
    control.markAsDirty();
    control.markAsTouched();
  }

  protected onSubmit(): void {
    this.registrationForm.markAllAsTouched();

    if (this.registrationForm.invalid) {
      this.localSubmitError.set(this.getInvalidFormMessage());
      return;
    }

    this.localSubmitError.set(null);
    this.store.dispatch(new SubmitRegistration(this.buildPayload())).subscribe({
      next: () => {
        if (this.store.selectSnapshot(RegistrationState.isSuccessful)) {
          void this.router.navigate(['/auth/login']);
        }
      },
    });
  }

  protected saveDraft(): void {
    console.log('provider draft', this.registrationForm.getRawValue());
  }

  private buildPayload(): ProviderRegistrationPayload {
    const value = this.registrationForm.getRawValue();

    return {
      role: 'input_provider',
      password: value.password,
      submitForReview: true,
      businessDetails: {
        businessName: value.businessName,
        registrationNumber: value.registrationNumber,
        tinNumber: value.tinNumber,
        businessAddress: value.businessAddress,
        contactPerson: value.contactPerson,
        phoneNumber: value.phoneNumber,
        emailAddress: value.emailAddress,
      },
      serviceType: {
        serviceTypes: value.serviceTypes,
      },
      serviceRegionCoverage: {
        operationalJurisdictions: value.operationalJurisdictions,
      },
      documentUpload: {
        businessRegistrationCertificate: value.businessRegistrationCertificate,
        tinCertificate: value.tinCertificate,
        directorIdFront: value.directorIdFront,
        portraitPhoto: value.portraitPhoto,
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
