import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  NgZone,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { firstValueFrom, fromEvent, startWith } from 'rxjs';
import {
  FormInputComponent,
  SelectOption,
} from '../../../../../shared/form-input/form-input.component';
import { ToastrService } from '../../../../../shared/toastr/toastr.service';
import { environment } from '../../../../../../environment/environment';
import { FarmersState, GetPortfolioFarmers } from '../farmers/farmers.state';
import { GetPortfolioFarms, PortfolioFarmsState } from '../farms/farms.state';
import {
  CreatePortfolioLoan,
  CreatePortfolioLoanPayload,
  PortfolioLoansState,
  TariaAssessmentPayload,
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
  private readonly ngZone = inject(NgZone);
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

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
  protected readonly isLoadingExistingRisk = signal(false);
  protected readonly existingRiskMessage = signal<string | null>(null);
  protected readonly riskScore = signal('—');
  protected readonly riskLevel = signal('—');
  private readonly tariaAssessment = signal<TariaAssessmentPayload | null>(null);
  private tariaWindow: Window | null = null;
  private tariaPollTimer: ReturnType<typeof window.setInterval> | null = null;
  private tariaPollInFlight = false;
  private tariaRecoveryDeadline = 0;
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
    this.destroyRef.onDestroy(() => this.stopTariaResultRecovery());

    fromEvent<MessageEvent>(window, 'message')
      .pipe(takeUntilDestroyed())
      .subscribe((event) => this.ngZone.run(() => this.handleTariaMessage(event)));

    this.loanForm.controls.farmerId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((farmerId) => {
        this.selectedFarmerId.set(farmerId ?? '');
        this.loanForm.controls.farmId.reset(null);

        this.clearTariaAssessment();
        this.existingRiskMessage.set(null);

        if (farmerId) {
          this.store.dispatch(new GetPortfolioFarms({ farmerId, rows: 100 })).subscribe();
        }
      });

    this.loanForm.controls.farmId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((farmId) => {
        const farmerId = this.selectedFarmerId();
        if (!farmerId || !farmId) {
          this.clearTariaAssessment();
          this.existingRiskMessage.set(null);
          return;
        }

        void this.loadExistingTariaAssessment(farmerId, farmId);
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
      this.restoreTariaAssessment(tariaAssessmentId);
    }

    const savedAssessment = sessionStorage.getItem('agrifinance_taria_assessment');
    if (savedAssessment) {
      try {
        const assessment = JSON.parse(savedAssessment) as TariaAssessmentPayload;
        if (
          assessment?.assessmentId &&
          assessment.farmerId === this.loanForm.controls.farmerId.value &&
          assessment.farmId === this.loanForm.controls.farmId.value &&
          Number.isFinite(Number(assessment.score))
        ) {
          this.setTariaAssessment(assessment);
        }
      } catch {
        sessionStorage.removeItem('agrifinance_taria_assessment');
      }
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

    const tariaUrl = new URL('https://taria.tripsecureagrifinanceltd.com/farmer-risk/assessment');
    tariaUrl.searchParams.set('sourceApplication', 'agrifinance');
    tariaUrl.searchParams.set('externalFarmerId', farmerId);
    tariaUrl.searchParams.set('farmId', payload.farmId);
    tariaUrl.searchParams.set('returnOrigin', window.location.origin);

    const tariaWindow = window.open(
      'about:blank',
      'agrifinance-taria-risk',
      'popup,width=1280,height=900',
    );
    if (!tariaWindow) {
      const msg = 'TARIA could not be opened. Please allow popups for Agrifinance and try again.';
      this.localSubmitError.set(msg);
      this.toastr.triggerToastr('error', msg);
      return;
    }

    this.tariaWindow = tariaWindow;
    tariaWindow.location.href = tariaUrl.toString();
    this.startTariaResultRecovery(farmerId, payload.farmId);
    this.toastr.triggerToastr('info', 'Complete the farmer risk assessment in the TARIA window.');
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

    if (!this.tariaAssessment()) {
      const msg = 'Complete the TARIA farmer risk assessment before submitting this loan.';
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
        sessionStorage.removeItem('agrifinance_taria_assessment');
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
      submissionTarget: submissionTarget === 'insurance' ? 'insurance_partner' : submissionTarget,
      ...(this.tariaAssessment() ? { tariaAssessment: this.tariaAssessment()! } : {}),
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

  private handleTariaMessage(event: MessageEvent): void {
    if (event.origin !== new URL('https://taria.tripsecureagrifinanceltd.com').origin) {
      return;
    }

    if (!this.tariaWindow || event.source !== this.tariaWindow) {
      return;
    }

    const message = event.data as {
      type?: string;
      assessment?: {
        assessmentId?: string;
        context?: { externalFarmerId?: string | null; farmId?: string | null };
        result?: Partial<TariaAssessmentPayload>;
      };
    } | null;
    if (message?.type !== 'taria.farmerRisk.completed' || !message.assessment?.assessmentId) {
      return;
    }

    const score = Number(message.assessment.result?.score);
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      this.toastr.triggerToastr('error', 'TARIA returned an invalid risk score.');
      return;
    }

    const assessment: TariaAssessmentPayload = {
      assessmentId: message.assessment.assessmentId,
      farmerId: message.assessment.context?.externalFarmerId || this.selectedFarmerId(),
      farmId: message.assessment.context?.farmId || this.loanForm.controls.farmId.value || undefined,
      score,
      ...(message.assessment.result?.rawScore !== undefined
        ? { rawScore: Number(message.assessment.result.rawScore) }
        : {}),
      ...(message.assessment.result?.riskLevel
        ? { riskLevel: message.assessment.result.riskLevel }
        : {}),
      ...(message.assessment.result?.loanRecommendationTier
        ? { loanRecommendationTier: message.assessment.result.loanRecommendationTier }
        : {}),
      ...(message.assessment.result?.loanAmount !== undefined
        ? { loanAmount: Number(message.assessment.result.loanAmount) }
        : {}),
      ...(message.assessment.result?.insurancePremium !== undefined
        ? { insurancePremium: Number(message.assessment.result.insurancePremium) }
        : {}),
      ...(message.assessment.result?.sectionScores
        ? { sectionScores: message.assessment.result.sectionScores }
        : {}),
    };

    this.setTariaAssessment(assessment);
    try {
      sessionStorage.setItem('agrifinance_taria_assessment', JSON.stringify(assessment));
    } catch {
      // keep the in-memory result when storage is unavailable
    }
    this.stopTariaResultRecovery();
    this.tariaWindow?.close();
    this.tariaWindow = null;
    this.toastr.triggerToastr('success', 'TARIA risk assessment completed successfully.');
  }

  private setTariaAssessment(assessment: TariaAssessmentPayload): void {
    const selectedFarmId = this.loanForm.controls.farmId.value;
    if (
      (assessment.farmerId && this.selectedFarmerId() && assessment.farmerId !== this.selectedFarmerId()) ||
      (assessment.farmId && selectedFarmId && assessment.farmId !== selectedFarmId)
    ) {
      return;
    }

    const score = Math.round(Number(assessment.score));
    this.tariaAssessment.set({ ...assessment, score });
    this.riskProfileLoaded.set(true);
    this.riskScore.set(`${score}/100`);
    this.riskLevel.set(assessment.riskLevel || this.toRiskLevel(score));

    const eligibleLoanAmount = Number(assessment.loanAmount);
    if (Number.isFinite(eligibleLoanAmount) && eligibleLoanAmount > 0) {
      this.loanForm.controls.loanAmount.setValue(eligibleLoanAmount);
    }
  }

  private clearTariaAssessment(): void {
    this.tariaAssessment.set(null);
    this.riskProfileLoaded.set(false);
    this.riskScore.set('—');
    this.riskLevel.set('—');
    sessionStorage.removeItem('agrifinance_taria_assessment');
  }

  private startTariaResultRecovery(farmerId: string, farmId: string): void {
    this.stopTariaResultRecovery();
    this.tariaRecoveryDeadline = Date.now() + 15_000;
    this.tariaPollTimer = window.setInterval(() => {
      if (this.tariaPollInFlight) {
        return;
      }

      const popupClosed = !this.tariaWindow || this.tariaWindow.closed;
      this.tariaPollInFlight = true;
      void this.loadExistingTariaAssessment(farmerId, farmId, {
        clearWhenMissing: false,
        showErrors: false,
      }).finally(() => {
        this.tariaPollInFlight = false;
        if (popupClosed && Date.now() >= this.tariaRecoveryDeadline) {
          this.stopTariaResultRecovery();
          this.tariaWindow = null;
        }
      });
    }, 1500);
  }

  private stopTariaResultRecovery(): void {
    if (this.tariaPollTimer !== null) {
      window.clearInterval(this.tariaPollTimer);
      this.tariaPollTimer = null;
    }
    this.tariaRecoveryDeadline = 0;
  }

  private async loadExistingTariaAssessment(
    farmerId: string,
    farmId: string,
    options: { clearWhenMissing?: boolean; showErrors?: boolean } = {},
  ): Promise<void> {
    const { clearWhenMissing = true, showErrors = true } = options;
    const lookupKey = `${farmerId}:${farmId}`;
    this.isLoadingExistingRisk.set(true);
    this.existingRiskMessage.set(null);

    try {
      const payload = await firstValueFrom(
        this.http.get<{
          data?: {
            assessmentId?: string;
            submittedAt?: string;
            persisted?: boolean;
            context?: { externalFarmerId?: string; farmId?: string; loanApplicationId?: string };
            result?: Partial<TariaAssessmentPayload>;
          } | null;
          message?: string;
        }>(
        `${environment.api}/portfolio/farmers/${encodeURIComponent(farmerId)}/farms/${encodeURIComponent(farmId)}/risk-assessment`,
        { withCredentials: true },
        ),
      );

      if (`${this.selectedFarmerId()}:${this.loanForm.controls.farmId.value}` !== lookupKey) {
        return;
      }

      const saved = payload.data;
      if (!saved?.assessmentId || !Number.isFinite(Number(saved.result?.score))) {
        if (clearWhenMissing) {
          this.clearTariaAssessment();
        }
        return;
      }

      const assessment: TariaAssessmentPayload = {
        assessmentId: saved.assessmentId,
        submittedAt: saved.submittedAt,
        persisted: saved.persisted,
        farmerId: saved.context?.externalFarmerId || farmerId,
        farmId: saved.context?.farmId || farmId,
        score: Number(saved.result?.score),
        ...(saved.result?.rawScore !== undefined ? { rawScore: Number(saved.result.rawScore) } : {}),
        ...(saved.result?.riskLevel ? { riskLevel: saved.result.riskLevel } : {}),
        ...(saved.result?.loanRecommendationTier
          ? { loanRecommendationTier: saved.result.loanRecommendationTier }
          : {}),
        ...(saved.result?.loanAmount !== undefined ? { loanAmount: Number(saved.result.loanAmount) } : {}),
        ...(saved.result?.insurancePremium !== undefined
          ? { insurancePremium: Number(saved.result.insurancePremium) }
          : {}),
        ...(saved.result?.sectionScores ? { sectionScores: saved.result.sectionScores } : {}),
      };

      this.setTariaAssessment(assessment);
      sessionStorage.setItem('agrifinance_taria_assessment', JSON.stringify(assessment));
    } catch (error) {
      if (showErrors && `${this.selectedFarmerId()}:${this.loanForm.controls.farmId.value}` === lookupKey) {
        // Keep a previously loaded result visible when a refresh is transiently unavailable.
        // Selecting a different farmer or farm clears the result before this lookup starts.
        if (!this.tariaAssessment()) {
          this.existingRiskMessage.set(
            error instanceof Error
              ? error.message
              : 'Unable to load the saved TARIA risk for this farm. You can open TARIA to calculate it.',
          );
        }
      }
    } finally {
      if (`${this.selectedFarmerId()}:${this.loanForm.controls.farmId.value}` === lookupKey) {
        this.isLoadingExistingRisk.set(false);
      }
    }
  }

  private restoreTariaAssessment(assessmentId: string): void {
    const savedAssessment = sessionStorage.getItem('agrifinance_taria_assessment');
    if (!savedAssessment) {
      return;
    }

    try {
      const assessment = JSON.parse(savedAssessment) as TariaAssessmentPayload;
      if (assessment.assessmentId === assessmentId) {
        this.setTariaAssessment(assessment);
      }
    } catch {
      sessionStorage.removeItem('agrifinance_taria_assessment');
    }
  }

  private toRiskLevel(score: number): string {
    if (score <= 50) return 'High Risk';
    if (score <= 80) return 'Medium Risk';
    return 'Low Risk';
  }
}
