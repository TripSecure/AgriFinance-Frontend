import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { FormInputComponent } from '../../../../shared/form-input/form-input.component';

type ProviderServiceType =
  | 'tractor_services'
  | 'irrigation_services'
  | 'agrochemicals'
  | 'soil_testing'
  | 'logistics_aggregation';

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
      return;
    }

    console.log('provider registration', this.registrationForm.getRawValue());
  }

  protected saveDraft(): void {
    console.log('provider draft', this.registrationForm.getRawValue());
  }
}
