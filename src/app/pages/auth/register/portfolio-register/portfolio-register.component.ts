import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { FormInputComponent } from '../../../../shared/form-input/form-input.component';

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
  staffId: FormControl<string>;
  regionDistrict: FormControl<string>;
  supervisorName: FormControl<string>;
  documentUpload: FormGroup<DocumentUploadControls>;
};

@Component({
  selector: 'app-portfolio-register',
  imports: [FormInputComponent, ReactiveFormsModule, RouterLink, MatIconModule],
  templateUrl: './portfolio-register.component.html',
  styleUrl: '../register.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioRegisterComponent {
  protected readonly pageTitle = 'Portfolio Officer Registration';
  protected readonly uploadRole = 'portfolio_officer';
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
      return;
    }

    console.log('portfolio registration', this.registrationForm.getRawValue());
  }

  protected saveDraft(): void {
    console.log('portfolio draft', this.registrationForm.getRawValue());
  }
}
