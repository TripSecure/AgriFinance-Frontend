import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatStepperModule } from '@angular/material/stepper';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';
import { environment } from '../../../../../../environment/environment';
import { FormInputComponent } from '../../../../../shared/form-input/form-input.component';
import { ToastrService } from '../../../../../shared/toastr/toastr.service';
import {
  CreateFarmerPayload,
  CreatePortfolioFarmer,
  Farmer,
  FarmersState,
  GetPortfolioFarmerDetails,
  UpdatePortfolioFarmer,
} from '../farmers/farmers.state';

type PersonalDetailsControls = {
  fullName: FormControl<string>;
  dateOfBirth: FormControl<string | Date>;
  gender: FormControl<string>;
  nationalIdNumber: FormControl<string>;
  phone: FormControl<string>;
  email: FormControl<string>;
};

type DocumentUploadControls = {
  nationalIdFront: FormControl<string>;
  nationalIdBack: FormControl<string>;
  passportPhoto: FormControl<string>;
  farmOwnershipDocument: FormControl<string>;
};

type FarmerDetailsControls = {
  farmerCode: FormControl<string>;
  region: FormControl<string>;
  district: FormControl<string>;
  community: FormControl<string>;
  gpsAddress: FormControl<string>;
  gpsLatitude: FormControl<number>;
  gpsLongitude: FormControl<number>;
  cooperativeName: FormControl<string>;
};

type ProductionDetailsControls = {
  farmSizeAcres: FormControl<number>;
  primaryCrop: FormControl<string>;
  secondaryCrop: FormControl<string>;
  annualYield: FormControl<number>;
  farmingExperienceYears: FormControl<number>;
  irrigationMethod: FormControl<string>;
};

type FinancialInformationControls = {
  bankName: FormControl<string>;
  accountNumber: FormControl<string>;
  mobileMoneyProvider: FormControl<string>;
  mobileMoneyNumber: FormControl<string>;
  estimatedAnnualIncomeGhs: FormControl<number>;
  existingLoans: FormControl<string>;
};

type DeclarationControls = {
  dataPrivacyConsent: FormControl<boolean>;
  accuracyDeclaration: FormControl<boolean>;
  creditVerificationConsent: FormControl<boolean>;
};

@Component({
  selector: 'app-add-farmer',
  imports: [
    FormInputComponent,
    MatButtonModule,
    MatIconModule,
    MatStepperModule,
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './add-farmer.component.html',
  styleUrl: './add-farmer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddFarmerComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly toastr = inject(ToastrService);

  protected readonly isCreating = this.store.selectSignal(FarmersState.isCreating);
  protected readonly isDetailLoading = this.store.selectSignal(FarmersState.isDetailLoading);
  protected readonly stateErrors = this.store.selectSignal(FarmersState.errors);
  protected readonly stateMessage = this.store.selectSignal(FarmersState.message);
  protected readonly farmerId = signal<string | null>(null);
  protected readonly localSubmitError = signal<string | null>(null);
  protected readonly isLinear = signal(true);
  protected readonly isEditMode = computed(() => Boolean(this.farmerId()));
  protected readonly pageTitle = computed(() => (this.isEditMode() ? 'Edit Farmer' : 'Add Farmer'));
  protected readonly submitButtonText = computed(() => {
    if (this.isCreating()) {
      return this.isEditMode() ? 'Updating...' : 'Submitting...';
    }

    return this.isEditMode() ? 'Update Farmer' : 'Submit For Review';
  });

  protected readonly uploadEndpoint = `${environment.api}/portfolio/farmer-documents/upload`;
  protected readonly genderOptions = ['female', 'male', 'other'];
  protected readonly mobileMoneyProviders = ['mtn', 'telecel', 'airteltigo'];
  protected readonly loanOptions = ['none', 'bank_loan', 'mobile_money_loan', 'cooperative_loan'];

  protected readonly personalDetailsForm = new FormGroup<PersonalDetailsControls>({
    fullName: new FormControl('', { nonNullable: true, validators: Validators.required }),
    dateOfBirth: new FormControl<string | Date>('', {
      nonNullable: true,
      validators: Validators.required,
    }),
    gender: new FormControl('female', { nonNullable: true, validators: Validators.required }),
    nationalIdNumber: new FormControl('', { nonNullable: true, validators: Validators.required }),
    phone: new FormControl('', { nonNullable: true, validators: Validators.required }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
  });

  protected readonly documentUploadForm = new FormGroup<DocumentUploadControls>({
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
    farmOwnershipDocument: new FormControl('', {
      nonNullable: true,
      validators: Validators.required,
    }),
  });

  protected readonly financialInformationForm = new FormGroup<FinancialInformationControls>({
    bankName: new FormControl('', { nonNullable: true, validators: Validators.required }),
    accountNumber: new FormControl('', { nonNullable: true, validators: Validators.required }),
    mobileMoneyProvider: new FormControl('mtn', {
      nonNullable: true,
      validators: Validators.required,
    }),
    mobileMoneyNumber: new FormControl('', { nonNullable: true, validators: Validators.required }),
    estimatedAnnualIncomeGhs: new FormControl(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0)],
    }),
    existingLoans: new FormControl('none', { nonNullable: true, validators: Validators.required }),
  });

  protected readonly declarationsForm = new FormGroup<DeclarationControls>({
    dataPrivacyConsent: new FormControl(false, {
      nonNullable: true,
      validators: Validators.requiredTrue,
    }),
    accuracyDeclaration: new FormControl(false, {
      nonNullable: true,
      validators: Validators.requiredTrue,
    }),
    creditVerificationConsent: new FormControl(false, {
      nonNullable: true,
      validators: Validators.requiredTrue,
    }),
  });

  ngOnInit(): void {
    const farmerId = this.route.snapshot.paramMap.get('farmerId');

    if (!farmerId) {
      return;
    }

    this.farmerId.set(farmerId);
    this.isLinear.set(false);
    this.store.dispatch(new GetPortfolioFarmerDetails(farmerId)).subscribe({
      next: () => {
        const farmer = this.store.selectSnapshot(FarmersState.selectedFarmer);
        if (farmer) {
          this.patchForm(farmer);
        }
      },
      error: () => this.toastr.triggerToastr('error', 'Unable to load farmer details.'),
    });
  }

  protected onSubmit(): void {
    this.markAllFormsTouched();

    if (this.hasInvalidForm()) {
      this.localSubmitError.set('Please complete all required farmer onboarding fields.');
      return;
    }

    this.localSubmitError.set(null);
    const farmerId = this.farmerId();
    const action = farmerId
      ? new UpdatePortfolioFarmer(farmerId, this.buildPayload())
      : new CreatePortfolioFarmer(this.buildPayload());

    this.store.dispatch(action).subscribe({
      next: () => {
        if (this.stateErrors().length) {
          this.toastr.triggerToastr('error', this.stateErrors()[0]);
          return;
        }

        const fallbackMessage = farmerId
          ? 'Farmer updated successfully.'
          : 'Farmer added successfully.';
        this.toastr.triggerToastr('success', this.stateMessage() || fallbackMessage);
        void this.router.navigate(['/dashboard/portfolio-officer/farmers']);
      },
      error: () => {
        const message = farmerId ? 'Unable to update farmer.' : 'Unable to add farmer.';
        this.toastr.triggerToastr('error', message);
      },
    });
  }

  private markAllFormsTouched(): void {
    this.personalDetailsForm.markAllAsTouched();
    this.documentUploadForm.markAllAsTouched();
    this.financialInformationForm.markAllAsTouched();
    this.declarationsForm.markAllAsTouched();
  }

  private hasInvalidForm(): boolean {
    return (
      this.personalDetailsForm.invalid ||
      this.documentUploadForm.invalid ||
      this.financialInformationForm.invalid ||
      this.declarationsForm.invalid
    );
  }

  private patchForm(farmer: Farmer): void {
    const personalDetails = this.getMergedRecord(farmer, ['personalDetails', 'personal_details']);
    const financialInformation = this.getMergedRecord(farmer, [
      'financials',
      'financialInformation',
      'financial_information',
    ]);
    const documentUpload = {
      ...this.getDocumentsRecord(farmer),
      ...this.getMergedRecord(farmer, ['documentUpload', 'document_upload', 'documents']),
    };
    const consentDeclarations = this.getMergedRecord(farmer, [
      'consent',
      'declarations',
      'consentDeclarations',
      'consent_declarations',
    ]);

    this.personalDetailsForm.patchValue({
      fullName:
        this.getString(farmer, ['fullName', 'full_name', 'name']) ||
        this.getString(personalDetails, ['fullName', 'full_name', 'name']),
      dateOfBirth: this.formatDateForInput(
        this.getString(farmer, ['dateOfBirth', 'date_of_birth', 'dob']) ||
          this.getString(personalDetails, ['dateOfBirth', 'date_of_birth', 'dob']),
      ),
      gender: this.getOptionValue(
        this.getString(farmer, ['gender']) || this.getString(personalDetails, ['gender']),
        this.genderOptions,
        'female',
      ),
      nationalIdNumber:
        this.getString(farmer, [
          'nationalId',
          'national_id',
          'nationalIdNumber',
          'national_id_number',
        ]) ||
        this.getString(personalDetails, [
          'nationalId',
          'national_id',
          'nationalIdNumber',
          'national_id_number',
        ]),
      phone:
        this.getString(farmer, ['phone', 'phoneNumber', 'phone_number']) ||
        this.getString(personalDetails, ['phone', 'phoneNumber', 'phone_number']),
      email: this.getString(farmer, ['email']) || this.getString(personalDetails, ['email']),
    });

    this.documentUploadForm.patchValue({
      nationalIdFront: this.getString(documentUpload, [
        'nationalIdFront',
        'national_id_front',
        'nationalIdFrontUrl',
        'national_id_front_url',
      ]),
      nationalIdBack: this.getString(documentUpload, [
        'nationalIdBack',
        'national_id_back',
        'nationalIdBackUrl',
        'national_id_back_url',
      ]),
      passportPhoto: this.getString(documentUpload, [
        'passportPhoto',
        'passport_photo',
        'passportPhotoUrl',
        'passport_photo_url',
      ]),
      farmOwnershipDocument: this.getString(documentUpload, [
        'farmOwnershipDocument',
        'farm_ownership_document',
        'farmOwnershipDocs',
        'farm_ownership_docs',
        'farmOwnershipDocumentUrl',
        'farm_ownership_document_url',
      ]),
    });

    this.financialInformationForm.patchValue({
      bankName: this.getString(financialInformation, ['bankName', 'bank_name']),
      accountNumber: this.getString(financialInformation, ['accountNumber', 'account_number']),
      mobileMoneyProvider: this.getOptionValue(
        this.getString(financialInformation, ['mobileMoneyProvider', 'mobile_money_provider']),
        this.mobileMoneyProviders,
        'mtn',
      ),
      mobileMoneyNumber: this.getString(financialInformation, [
        'mobileMoneyNumber',
        'mobile_money_number',
      ]),
      estimatedAnnualIncomeGhs: this.getNumber(financialInformation, [
        'estimatedAnnualIncomeGhs',
        'estimated_annual_income_ghs',
        'estimatedAnnualIncome',
        'estimated_annual_income',
      ]),
      existingLoans: this.getOptionValue(
        this.getString(financialInformation, ['existingLoans', 'existing_loans']),
        this.loanOptions,
        'none',
      ),
    });

    this.declarationsForm.patchValue({
      dataPrivacyConsent: this.getBoolean(consentDeclarations, [
        'dataPrivacyConsent',
        'data_privacy_consent',
      ]),
      accuracyDeclaration: this.getBoolean(consentDeclarations, [
        'accuracyConsent',
        'accuracy_consent',
        'accuracyDeclaration',
        'accuracy_declaration',
      ]),
      creditVerificationConsent: this.getBoolean(consentDeclarations, [
        'thirdPartyCreditVerificationConsent',
        'third_party_credit_verification_consent',
        'creditVerificationConsent',
        'credit_verification_consent',
      ]),
    });
  }

  private buildPayload(): CreateFarmerPayload {
    const personal = this.personalDetailsForm.getRawValue();
    const financials = this.financialInformationForm.getRawValue();
    const documents = this.documentUploadForm.getRawValue();
    const declarations = this.declarationsForm.getRawValue();

    return {
      personalDetails: {
        fullName: personal.fullName,
        dateOfBirth: this.formatDateForPayload(personal.dateOfBirth),
        gender: personal.gender,
        nationalId: personal.nationalIdNumber,
        phone: personal.phone,
        email: personal.email,
      },
      financials: {
        bankName: financials.bankName,
        accountNumber: financials.accountNumber,
        mobileMoneyProvider: financials.mobileMoneyProvider,
        mobileMoneyNumber: financials.mobileMoneyNumber,
        estimatedAnnualIncomeGhs: Number(financials.estimatedAnnualIncomeGhs) || 0,
        existingLoans: financials.existingLoans,
      },
      documentUpload: {
        nationalIdFront: documents.nationalIdFront,
        nationalIdBack: documents.nationalIdBack,
        passportPhoto: documents.passportPhoto,
        farmOwnershipDocument: documents.farmOwnershipDocument,
      },
      consent: {
        dataPrivacyConsent: declarations.dataPrivacyConsent,
        accuracyConsent: declarations.accuracyDeclaration,
        thirdPartyCreditVerificationConsent: declarations.creditVerificationConsent,
      },
      submitForReview: true,
      // Fallback properties for compatibility
      fullName: personal.fullName,
      nationalId: personal.nationalIdNumber,
      phone: personal.phone,
      email: personal.email,
      dateOfBirth: this.formatDateForPayload(personal.dateOfBirth),
      gender: personal.gender,
      financialInformation: {
        bankName: financials.bankName,
        accountNumber: financials.accountNumber,
        mobileMoneyProvider: financials.mobileMoneyProvider,
        mobileMoneyNumber: financials.mobileMoneyNumber,
        estimatedAnnualIncome: Number(financials.estimatedAnnualIncomeGhs) || 0,
        existingLoans: financials.existingLoans,
      },
      consentDeclarations: {
        dataPrivacyConsent: declarations.dataPrivacyConsent,
        accuracyConsent: declarations.accuracyDeclaration,
        thirdPartyCreditVerificationConsent: declarations.creditVerificationConsent,
      },
    };
  }

  protected getUploadedFileName(controlName: keyof DocumentUploadControls): string {
    const value = this.documentUploadForm.controls[controlName].value;
    return value ? value.split('/').pop() || value : '';
  }

  protected getUploadStatus(controlName: keyof DocumentUploadControls): 'idle' | 'uploaded' {
    return this.documentUploadForm.controls[controlName].value ? 'uploaded' : 'idle';
  }

  private getRecord(value: unknown): Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private getMergedRecord(
    record: Record<string, unknown>,
    keys: string[],
  ): Record<string, unknown> {
    return keys.reduce<Record<string, unknown>>(
      (merged, key) => ({ ...merged, ...this.getRecord(record[key]) }),
      {},
    );
  }

  private getDocumentsRecord(farmer: Record<string, unknown>): Record<string, unknown> {
    const documentRecord: Record<string, unknown> = {};

    for (const key of ['documents', 'farmerDocuments', 'farmer_documents']) {
      const value = farmer[key];
      if (!Array.isArray(value)) {
        continue;
      }

      for (const item of value) {
        const document = this.getRecord(item);
        const documentType = this.normalizeText(
          this.getString(document, ['documentType', 'document_type', 'type', 'name']),
        );
        const documentPath = this.getString(document, [
          'url',
          'path',
          'fileUrl',
          'file_url',
          'documentUrl',
          'document_url',
          'documentPath',
          'document_path',
        ]);

        if (!documentType || !documentPath) {
          continue;
        }

        if (documentType === 'nationalidfront') {
          documentRecord['nationalIdFront'] = documentPath;
        }

        if (documentType === 'nationalidback') {
          documentRecord['nationalIdBack'] = documentPath;
        }

        if (documentType === 'passportphoto') {
          documentRecord['passportPhoto'] = documentPath;
        }

        if (documentType === 'farmownershipdocument' || documentType === 'farmownershipdocs') {
          documentRecord['farmOwnershipDocument'] = documentPath;
        }
      }
    }

    return documentRecord;
  }

  private getFirstValue(record: Record<string, unknown>, keys: string[]): unknown {
    for (const key of keys) {
      if (record[key] !== undefined && record[key] !== null && record[key] !== '') {
        return record[key];
      }
    }

    return null;
  }

  private getGpsRecord(value: unknown): Record<string, unknown> {
    if (Array.isArray(value)) {
      return { latitude: value[0], longitude: value[1] };
    }

    if (typeof value === 'string') {
      const numbers = value.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
      return { latitude: numbers[0], longitude: numbers[1] };
    }

    return this.getRecord(value);
  }

  private getString(record: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'string') {
        return value;
      }

      if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
      }
    }

    return '';
  }

  private getNumber(record: Record<string, unknown>, keys: string[]): number {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }

      if (typeof value === 'string') {
        const numberValue = Number(value);
        if (Number.isFinite(numberValue)) {
          return numberValue;
        }
      }
    }

    return 0;
  }

  private getBoolean(record: Record<string, unknown>, keys: string[]): boolean {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'boolean') {
        return value;
      }

      if (typeof value === 'string') {
        return ['true', 'yes', '1'].includes(value.toLowerCase());
      }

      if (typeof value === 'number') {
        return value === 1;
      }
    }

    return false;
  }

  private getOptionValue(value: string, options: readonly string[], fallback: string): string {
    const normalizedValue = this.normalizeText(value);
    return options.find((option) => this.normalizeText(option) === normalizedValue) ?? fallback;
  }

  private normalizeText(value: string): string {
    return value.replace(/[^a-z0-9]/gi, '').toLowerCase();
  }

  private formatDateForInput(value: string): string | Date {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date;
  }

  private formatDateForPayload(value: string | Date): string {
    if (value instanceof Date) {
      return value.toISOString();
    }

    return value;
  }
}
