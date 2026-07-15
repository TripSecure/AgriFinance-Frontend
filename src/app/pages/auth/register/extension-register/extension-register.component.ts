import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { FormInputComponent } from '../../../../shared/form-input/form-input.component';

type FileControlValue = File[];

type RoleRegistrationControls = {
  fullName: FormControl<string>;
  dateOfBirth: FormControl<string>;
  nationalIdNumber: FormControl<string>;
  phone: FormControl<string>;
  email: FormControl<string>;
  staffId: FormControl<string>;
  regionDistrict: FormControl<string>;
  supervisorName: FormControl<string>;
  nationalIdPhotos: FormControl<FileControlValue>;
  passportPhoto: FormControl<FileControlValue>;
};

@Component({
  selector: 'app-extension-register',
  imports: [FormInputComponent, ReactiveFormsModule, RouterLink, MatIconModule],
  templateUrl: './extension-register.component.html',
  styleUrl: '../register.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExtensionRegisterComponent {
  protected readonly pageTitle = 'Extension Officer Registration';
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
    staffId: new FormControl('', { nonNullable: true, validators: Validators.required }),
    regionDistrict: new FormControl('Accra Metropolitan', {
      nonNullable: true,
      validators: Validators.required,
    }),
    supervisorName: new FormControl('', { nonNullable: true, validators: Validators.required }),
    nationalIdPhotos: new FormControl<FileControlValue>([], {
      nonNullable: true,
      validators: Validators.required,
    }),
    passportPhoto: new FormControl<FileControlValue>([], {
      nonNullable: true,
      validators: Validators.required,
    }),
  });

  protected onSubmit(): void {
    this.registrationForm.markAllAsTouched();

    if (this.registrationForm.invalid) {
      return;
    }

    console.log('extension registration', this.registrationForm.getRawValue());
  }

  protected saveDraft(): void {
    console.log('extension draft', this.registrationForm.getRawValue());
  }
}
