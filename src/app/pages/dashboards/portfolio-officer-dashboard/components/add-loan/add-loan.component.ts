import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { startWith } from 'rxjs';
import {
  FormInputComponent,
  SelectOption,
} from '../../../../../shared/form-input/form-input.component';
import { ToastrService } from '../../../../../shared/toastr/toastr.service';
import { FarmersState, GetPortfolioFarmers } from '../farmers/farmers.state';
import { GetPortfolioFarms, PortfolioFarmsState } from '../farms/farms.state';
import {
  CreatePortfolioLoan,
  CreatePortfolioLoanPayload,
  CreatePortfolioLoanRiskPreview,
  PortfolioLoansState,
} from '../loans/loans.state';

type LoanFormControls = {
  farmerId: FormControl<string | null>;
  farmId: FormControl<string | null>;
  plannedAcreage: FormControl<number | null>;
  expectedYield: FormControl<number | null>;
  plantingDate: FormControl<Date | null>;
  harvestDate: FormControl<Date | null>;
  loanAmount: FormControl<number | null>;
  interestRate: FormControl<string | null>;
  repaymentPeriod: FormControl<string | null>;
  agrochemicals: FormControl<boolean | null>;
  seeds: FormControl<boolean | null>;
  irrigation: FormControl<boolean | null>;
  farmEquipment: FormControl<boolean | null>;
  insurance: FormControl<boolean | null>;
  logistics: FormControl<boolean | null>;
};

@Component({
  selector: 'app-add-loan',
  imports: [CurrencyPipe, FormInputComponent, MatIconModule, ReactiveFormsModule],
  templateUrl: './add-loan.component.html',
  styleUrl: './add-loan.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddLoanComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly toastr = inject(ToastrService);

  protected readonly isCreating = this.store.selectSignal(PortfolioLoansState.isCreating);
  protected readonly isLoadingRiskPreview = this.store.selectSignal(
    PortfolioLoansState.isLoadingRiskPreview,
  );
  protected readonly stateErrors = this.store.selectSignal(PortfolioLoansState.errors);
  protected readonly stateMessage = this.store.selectSignal(PortfolioLoansState.message);
  protected readonly farmers = this.store.selectSignal(FarmersState.farmers);
  protected readonly farms = this.store.selectSignal(PortfolioFarmsState.farms);
  protected readonly isLoadingFarmers = this.store.selectSignal(FarmersState.isLoading);
  protected readonly isLoadingFarms = this.store.selectSignal(PortfolioFarmsState.isLoading);

  protected readonly riskProfileLoaded = signal(false);
  protected readonly riskScore = signal('78/100');
  protected readonly riskLevel = signal('Medium-Low');
  protected readonly selectedFarmerId = signal('');
  protected readonly localSubmitError = signal<string | null>(null);

  protected readonly farmerOptions = computed<SelectOption[]>(() => {
    return this.farmers().map((farmer) => {
      const name = farmer.fullName || farmer.full_name || 'Farmer';
      const code = farmer.farmerCode || farmer.farmer_code;
      return { id: farmer.id, name: code ? `${name} (${code})` : name };
    });
  });

  protected readonly farmOptions = computed<SelectOption[]>(() => {
    const farmerId = this.selectedFarmerId();

    return this.farms()
      .filter((farm) => {
        const associatedFarmerId = farm.farmerId ?? farm.farmer?.id;
        return !farmerId || !associatedFarmerId || associatedFarmerId === farmerId;
      })
      .map((farm) => {
        const name = farm.farmName || farm.locationLabel || farm.location || 'Farm';
        const crop = farm.cropType || farm.primaryCrop;
        return { id: farm.id, name: crop ? `${name} (${crop})` : name };
      });
  });

  protected readonly repaymentPeriodOptions: SelectOption[] = [
    { id: '6', name: '6 Months' },
    { id: '12', name: '12 Months' },
    { id: '18', name: '18 Months' },
    { id: '24', name: '24 Months' },
  ];

  protected readonly loanForm = new FormGroup<LoanFormControls>({
    farmerId: new FormControl<string | null>(null, Validators.required),
    farmId: new FormControl<string | null>(null, Validators.required),
    plannedAcreage: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(0.01),
    ]),
    expectedYield: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
    plantingDate: new FormControl<Date | null>(null, Validators.required),
    harvestDate: new FormControl<Date | null>(null, Validators.required),
    loanAmount: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
    interestRate: new FormControl<string | null>(null),
    repaymentPeriod: new FormControl<string | null>(null, Validators.required),
    agrochemicals: new FormControl<boolean | null>(null),
    seeds: new FormControl<boolean | null>(null),
    irrigation: new FormControl<boolean | null>(null),
    farmEquipment: new FormControl<boolean | null>(null),
    insurance: new FormControl<boolean | null>(null),
    logistics: new FormControl<boolean | null>(null),
  });

  private readonly loanAmount = toSignal(
    this.loanForm.controls.loanAmount.valueChanges.pipe(
      startWith(this.loanForm.controls.loanAmount.value),
    ),
  );
  private readonly repaymentPeriod = toSignal(
    this.loanForm.controls.repaymentPeriod.valueChanges.pipe(
      startWith(this.loanForm.controls.repaymentPeriod.value),
    ),
  );

  protected readonly principalAmount = computed(() => Number(this.loanAmount()) || 0);
  protected readonly insurancePremium = computed(() => this.principalAmount() * 0.012);
  protected readonly applicationFee = 25;
  protected readonly totalRepayable = computed(() => {
    const annualInterest = this.principalAmount() * 0.045;
    return this.principalAmount() + annualInterest + this.insurancePremium() + this.applicationFee;
  });
  protected readonly monthlyInstallment = computed(() => {
    const installments = Number(this.repaymentPeriod()) || 1;
    return this.totalRepayable() / installments;
  });

  constructor() {
    this.loanForm.controls.farmerId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((farmerId) => {
        this.selectedFarmerId.set(farmerId ?? '');
        this.loanForm.controls.farmId.reset(null);

        if (farmerId) {
          this.store.dispatch(new GetPortfolioFarms({ farmerId, rows: 100 })).subscribe();
        }
      });
  }

  ngOnInit(): void {
    this.store.dispatch(new GetPortfolioFarmers({ rows: 100 })).subscribe();

    const tariaAssessmentId = this.route.snapshot.queryParamMap.get('tariaAssessmentId');
    const savedDraft = sessionStorage.getItem('agrifinance_add_loan_draft');

    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft) {
          this.loanForm.patchValue(draft);
          if (draft.farmerId) {
            this.selectedFarmerId.set(draft.farmerId);
            this.store
              .dispatch(new GetPortfolioFarms({ farmerId: draft.farmerId, rows: 100 }))
              .subscribe(() => {
                if (draft.farmId) {
                  this.loanForm.controls.farmId.setValue(draft.farmId);
                }
              });
          }
        }
      } catch (e) {
        console.error('Failed to restore loan draft', e);
      }
      sessionStorage.removeItem('agrifinance_add_loan_draft');
    }

    if (tariaAssessmentId) {
      this.riskProfileLoaded.set(true);
      this.toastr.triggerToastr('success', 'TARIA AI risk assessment completed successfully.');
    }
  }

  protected loadRiskProfile(): void {
    this.markAllFormsTouched();
    this.localSubmitError.set(null);

    const formVal = this.loanForm.getRawValue();
    if (!formVal.farmerId) {
      const msg = 'Please select a farmer before loading the risk profile.';
      this.localSubmitError.set(msg);
      this.toastr.triggerToastr('error', msg);
      this.loanForm.controls.farmerId.setErrors({ required: true });
      return;
    }

    if (!formVal.farmId) {
      const msg = 'Please select an associated farm before loading the risk profile.';
      this.localSubmitError.set(msg);
      this.toastr.triggerToastr('error', msg);
      this.loanForm.controls.farmId.setErrors({ required: true });
      return;
    }

    if (
      this.loanForm.controls.plannedAcreage.invalid ||
      this.loanForm.controls.expectedYield.invalid ||
      this.loanForm.controls.plantingDate.invalid ||
      this.loanForm.controls.harvestDate.invalid
    ) {
      const msg =
        'Please complete the crop plan details (acreage, yield, planting and harvest dates) before loading the risk profile.';
      this.localSubmitError.set(msg);
      this.toastr.triggerToastr('error', msg);
      return;
    }

    const data = this.buildPayload('bank');
    if (!data) {
      const msg = 'Please complete all required fields before loading the risk profile.';
      this.localSubmitError.set(msg);
      this.toastr.triggerToastr('error', msg);
      return;
    }

    const { farmerId, payload } = data;

    try {
      sessionStorage.setItem(
        'agrifinance_add_loan_draft',
        JSON.stringify(this.loanForm.getRawValue()),
      );
    } catch {
      // ignore storage write errors
    }

    this.store
      .dispatch(new CreatePortfolioLoanRiskPreview(farmerId, payload))
      .subscribe({
        next: () => {
          if (this.stateErrors().length) {
            this.toastr.triggerToastr('error', this.stateErrors()[0]);
            return;
          }

          const tariaUrl = `https://taria.tripsecureagrifinanceltd.com/farmer-risk/assessment?farmerId=${encodeURIComponent(
            farmerId,
          )}&farmId=${encodeURIComponent(payload.farmId)}`;
          window.location.href = tariaUrl;
        },
        error: () => {
          this.toastr.triggerToastr('error', 'Unable to initiate risk assessment with TARIA AI.');
        },
      });
  }

  protected onSubmit(submissionTarget: 'bank' | 'insurance'): void {
    this.markAllFormsTouched();
    this.localSubmitError.set(null);

    if (this.loanForm.invalid) {
      const msg = 'Please complete all required fields before submitting.';
      this.localSubmitError.set(msg);
      this.toastr.triggerToastr('error', msg);
      return;
    }

    const data = this.buildPayload(submissionTarget);
    if (!data) {
      const msg = 'Please complete all required fields before submitting.';
      this.localSubmitError.set(msg);
      this.toastr.triggerToastr('error', msg);
      return;
    }

    const { farmerId, payload } = data;
    this.store.dispatch(new CreatePortfolioLoan(farmerId, payload)).subscribe({
      next: () => {
        if (this.stateErrors().length) {
          this.toastr.triggerToastr('error', this.stateErrors()[0]);
          return;
        }

        sessionStorage.removeItem('agrifinance_add_loan_draft');
        this.toastr.triggerToastr(
          'success',
          this.stateMessage() || 'Loan application submitted successfully.',
        );
        void this.router.navigate(['/dashboard/portfolio-officer/loans']);
      },
      error: () => {
        this.toastr.triggerToastr('error', 'Unable to submit loan application.');
      },
    });
  }

  private buildPayload(
    submissionTarget: 'bank' | 'insurance' = 'bank',
  ): { farmerId: string; payload: CreatePortfolioLoanPayload } | null {
    const val = this.loanForm.getRawValue();
    if (!val.farmerId) {
      const msg = 'Please select an associated farmer.';
      this.localSubmitError.set(msg);
      this.loanForm.controls.farmerId.setErrors({ required: true });
      return null;
    }
    if (!val.farmId) {
      const msg = 'Please select an associated farm.';
      this.localSubmitError.set(msg);
      this.loanForm.controls.farmId.setErrors({ required: true });
      return null;
    }

    const selectedServices: string[] = [];
    if (val.agrochemicals) selectedServices.push('agrochemicals');
    if (val.seeds) selectedServices.push('seeds');
    if (val.irrigation) selectedServices.push('irrigation');
    if (val.farmEquipment) selectedServices.push('farmEquipment');
    if (val.insurance) selectedServices.push('insurance');
    if (val.logistics) selectedServices.push('logistics');

    const payload: CreatePortfolioLoanPayload = {
      farmId: val.farmId,
      cropPlan: {
        plannedAcreageHa: Number(val.plannedAcreage) || 0,
        expectedYieldMt: Number(val.expectedYield) || 0,
        plantingDate: this.formatDate(val.plantingDate),
        harvestDate: this.formatDate(val.harvestDate),
      },
      loanParameters: {
        loanAmount: Number(val.loanAmount) || 0,
        interestRateAnnual: 4.5,
        repaymentPeriodMonths: Number(val.repaymentPeriod) || 12,
      },
      selectedServices,
      insuranceIncluded: Boolean(val.insurance),
      submissionTarget,
    };

    return { farmerId: val.farmerId, payload };
  }

  private formatDate(date: Date | string | null | undefined): string {
    if (!date) return '';
    if (typeof date === 'string') {
      return date.split('T')[0];
    }
    if (date instanceof Date && !isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    return '';
  }

  private markAllFormsTouched(): void {
    this.loanForm.markAllAsTouched();
  }
}
