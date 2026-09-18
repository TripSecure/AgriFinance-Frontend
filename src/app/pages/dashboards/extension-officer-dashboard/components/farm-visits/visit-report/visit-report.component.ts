import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';
import { FormInputComponent } from '../../../../../../shared/form-input/form-input.component';
import { extractErrorMessage } from '../../../../../../shared/request.utils';
import { ToastrService } from '../../../../../../shared/toastr/toastr.service';
import { FarmVisit, FarmVisitsState, GetExtensionVisitDetail, SubmitVisitReport, VisitReportPayload } from '../farm-visits.state';

const parseLines = (value: string): string[] =>
  value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

const toDateInputValue = (value: string | null | undefined): string => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 10);
};

@Component({
  selector: 'app-visit-report',
  imports: [DecimalPipe, FormInputComponent, ReactiveFormsModule, RouterLink],
  templateUrl: './visit-report.component.html',
  styleUrl: './visit-report.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VisitReportComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly toastr = inject(ToastrService);

  protected readonly visit = this.store.selectSignal(FarmVisitsState.visitDetail);
  protected readonly isLoading = this.store.selectSignal(FarmVisitsState.isDetailLoading);
  protected readonly isSaving = this.store.selectSignal(FarmVisitsState.isSubmittingReport);

  private visitId = '';

  protected readonly reportForm = new FormGroup({
    visitDate: new FormControl('', { nonNullable: true }),
    landPreparationStatus: new FormControl('', { nonNullable: true }),
    plantingStatus: new FormControl('', { nonNullable: true }),
    plantingDate: new FormControl('', { nonNullable: true }),
    seedVariety: new FormControl('', { nonNullable: true }),
    fertilizerApplied: new FormControl(false, { nonNullable: true }),
    fertilizerType: new FormControl('', { nonNullable: true }),
    germinationRatePercent: new FormControl('', { nonNullable: true }),
    germinationCondition: new FormControl('', { nonNullable: true }),
    pestPressureLevel: new FormControl('', { nonNullable: true }),
    pestWeedDetails: new FormControl('', { nonNullable: true }),
    irrigationStatus: new FormControl('', { nonNullable: true }),
    photos: new FormControl('', { nonNullable: true }),
    yieldEstimate: new FormControl('', { nonNullable: true }),
    yieldConfidenceLevel: new FormControl('', { nonNullable: true }),
    riskNotes: new FormControl('', { nonNullable: true }),
    alertGenerated: new FormControl(false, { nonNullable: true }),
  });

  protected readonly landPreparationOptions = ['not_started', 'in_progress', 'complete'];
  protected readonly plantingStatusOptions = ['not_planted', 'planted', 'germinating', 'growing', 'harvested'];
  protected readonly germinationConditionOptions = ['poor', 'fair', 'good', 'excellent'];
  protected readonly pestPressureOptions = ['none', 'low', 'medium', 'high'];
  protected readonly irrigationStatusOptions = ['adequate', 'inadequate', 'none'];
  protected readonly confidenceLevelOptions = ['low', 'medium', 'high'];

  protected get isApproved(): boolean {
    return (this.visit()?.status ?? '').toLowerCase() === 'approved';
  }

  ngOnInit(): void {
    this.visitId = this.route.snapshot.paramMap.get('visitId') ?? '';
    if (!this.visitId) {
      return;
    }

    this.store.dispatch(new GetExtensionVisitDetail(this.visitId)).subscribe(() => {
      const visit = this.store.selectSnapshot(FarmVisitsState.visitDetail);
      if (visit) {
        this.patchFormFromVisit(visit);
      }
    });
  }

  protected formatLabel(value: string): string {
    return (
      value
        .replace(/[_-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (letter) => letter.toUpperCase()) || '-'
    );
  }

  protected onSaveDraft(): void {
    this.save(false);
  }

  protected onSubmitReport(): void {
    this.save(true);
  }

  private patchFormFromVisit(visit: FarmVisit): void {
    const checklist = (visit.checklist ?? {}) as Record<string, unknown>;
    const asString = (value: unknown): string => (typeof value === 'string' ? value : value != null ? String(value) : '');

    this.reportForm.patchValue({
      visitDate: toDateInputValue(visit.visitScheduling?.date),
      landPreparationStatus: asString(checklist['landPreparationStatus']),
      plantingStatus: asString(checklist['plantingStatus']),
      plantingDate: toDateInputValue(asString(checklist['plantingDate']) || null),
      seedVariety: asString(checklist['seedVariety']),
      fertilizerApplied: Boolean(checklist['fertilizerApplied']),
      fertilizerType: asString(checklist['fertilizerType']),
      germinationRatePercent: asString(checklist['germinationRatePercent']),
      germinationCondition: asString(checklist['germinationCondition']),
      pestPressureLevel: asString(checklist['pestPressureLevel']),
      pestWeedDetails: asString(checklist['pestWeedDetails']),
      irrigationStatus: asString(checklist['irrigationStatus']),
      photos: (visit.photos ?? []).join('\n'),
      yieldEstimate: visit.yieldEstimate != null ? String(visit.yieldEstimate) : '',
      yieldConfidenceLevel: asString(checklist['yieldConfidenceLevel']),
      riskNotes: visit.riskNotes ?? '',
      alertGenerated: Boolean(visit.alertGenerated),
    });

    if (this.isApproved) {
      this.reportForm.disable();
    }
  }

  private save(submit: boolean): void {
    const raw = this.reportForm.getRawValue();

    const payload: VisitReportPayload = {
      checklist: {
        landPreparationStatus: raw.landPreparationStatus || null,
        plantingStatus: raw.plantingStatus || null,
        plantingDate: raw.plantingDate || null,
        seedVariety: raw.seedVariety || null,
        fertilizerApplied: raw.fertilizerApplied,
        fertilizerType: raw.fertilizerType || null,
        germinationRatePercent: raw.germinationRatePercent ? Number(raw.germinationRatePercent) : null,
        germinationCondition: raw.germinationCondition || null,
        pestPressureLevel: raw.pestPressureLevel || null,
        pestWeedDetails: raw.pestWeedDetails || null,
        irrigationStatus: raw.irrigationStatus || null,
        yieldConfidenceLevel: raw.yieldConfidenceLevel || null,
      },
      photos: parseLines(raw.photos),
      yieldEstimate: raw.yieldEstimate ? Number(raw.yieldEstimate) : null,
      riskNotes: raw.riskNotes || null,
      alertGenerated: raw.alertGenerated,
      submit,
      visitDate: raw.visitDate ? new Date(raw.visitDate).toISOString() : undefined,
    };

    this.store.dispatch(new SubmitVisitReport(this.visitId, payload)).subscribe({
      next: () => {
        const errors = this.store.selectSnapshot(FarmVisitsState.submitErrors);
        if (errors.length) {
          this.toastr.triggerToastr('error', errors[0]);
          return;
        }

        const message = this.store.selectSnapshot(FarmVisitsState.submitMessage);
        this.toastr.triggerToastr('success', message || 'Visit report saved successfully.');
        if (submit) {
          void this.router.navigate(['/dashboard/extension-officer/visits']);
        }
      },
      error: (error: unknown) =>
        this.toastr.triggerToastr('error', extractErrorMessage(error, 'Unable to save this visit report.')),
    });
  }
}
