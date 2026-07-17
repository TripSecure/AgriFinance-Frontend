import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { FormInputComponent } from '../../../../shared/form-input/form-input.component';

type ProviderRegistrationControls = {
  businessName: FormControl<string>;
  registrationNumber: FormControl<string>;
  tin: FormControl<string>;
  businessAddress: FormControl<string>;
  contactPerson: FormControl<string>;
  phone: FormControl<string>;
  email: FormControl<string>;
  tractorServices: FormControl<boolean>;
  irrigationServices: FormControl<boolean>;
  agrochemicals: FormControl<boolean>;
  soilTesting: FormControl<boolean>;
  logisticsAggregation: FormControl<boolean>;
  operationalJurisdiction: FormControl<string>;
  businessRegistrationCertificate: FormControl<string>;
  tinCertificate: FormControl<string>;
  directorId: FormControl<string>;
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
  protected readonly uploadRole = 'input_service_provider';
  protected readonly operationalJurisdictions = [
    'Select primary region...',
    'Accra Metropolitan',
    'Kumasi Metropolitan',
    'Tamale Metropolitan',
  ];
  protected readonly registrationForm = new FormGroup<ProviderRegistrationControls>({
    businessName: new FormControl('', { nonNullable: true, validators: Validators.required }),
    registrationNumber: new FormControl('', { nonNullable: true, validators: Validators.required }),
    tin: new FormControl('', { nonNullable: true, validators: Validators.required }),
    businessAddress: new FormControl('', { nonNullable: true, validators: Validators.required }),
    contactPerson: new FormControl('', { nonNullable: true, validators: Validators.required }),
    phone: new FormControl('', { nonNullable: true, validators: Validators.required }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    tractorServices: new FormControl(false, { nonNullable: true }),
    irrigationServices: new FormControl(false, { nonNullable: true }),
    agrochemicals: new FormControl(false, { nonNullable: true }),
    soilTesting: new FormControl(true, { nonNullable: true }),
    logisticsAggregation: new FormControl(false, { nonNullable: true }),
    operationalJurisdiction: new FormControl('Select primary region...', {
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
    directorId: new FormControl('', {
      nonNullable: true,
      validators: Validators.required,
    }),
    portraitPhoto: new FormControl('', {
      nonNullable: true,
      validators: Validators.required,
    }),
  });

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
