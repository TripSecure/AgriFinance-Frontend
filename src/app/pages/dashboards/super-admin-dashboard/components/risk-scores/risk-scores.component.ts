import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Dialog } from 'primeng/dialog';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { Store } from '@ngxs/store';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import {
  AdminRiskScore,
  AdminRiskScoresQueryParams,
  AdminRiskScoresState,
  GetAdminRiskScores,
} from './risk-scores.state';

interface CategoryFilterOption {
  label: string;
  value: string;
  icon: string;
}

interface RiskScoreRow {
  score: AdminRiskScore;
  categoryLabel: string;
  factors: string[];
}

interface SectionFactorView {
  label: string;
  value: number;
  icon: string;
  affects: string;
}

interface ApplicationFactorView {
  label: string;
  value: string;
}

const categoryOptions: readonly CategoryFilterOption[] = [
  { label: 'Low', value: 'low', icon: 'check_circle' },
  { label: 'Medium', value: 'medium', icon: 'pending' },
  { label: 'Elevated', value: 'elevated', icon: 'warning' },
  { label: 'High', value: 'high', icon: 'error' },
];

const sectionFactorMeta: Record<string, { icon: string; affects: string }> = {
  'Crop Risk': { icon: 'grass', affects: 'Crop failure coverage and expected yield volatility.' },
  'Farm Size Risk': { icon: 'landscape', affects: 'Loan eligibility percentage and maximum requested amount.' },
  'Input & Practices Risk': { icon: 'inventory_2', affects: 'Recommended input bundle and premium category.' },
  'Weather & Climate Risk': { icon: 'cloud', affects: 'Weather-index insurance premium and payout triggers.' },
  'Past Loss Risk': { icon: 'history', affects: 'Overall risk category and applicable interest rate tier.' },
};

const applicationFactorLabels: Record<string, string> = {
  gps_captured: 'GPS location captured',
  email_present: 'Email on file',
  years_farming: 'Years farming',
  consent_bundle: 'Consented to loan bundle',
  document_count: 'Documents on file',
  consent_data_sharing: 'Consented to data sharing',
  prior_default_penalty: 'Prior default penalty',
  base_score: 'Base application score',
  farm_size: 'Farm size score',
};

@Component({
  selector: 'app-risk-scores',
  imports: [DatePipe, Dialog, MenuModule, TableModule],
  templateUrl: './risk-scores.component.html',
  styleUrl: './risk-scores.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RiskScoresComponent {
  private readonly store = inject(Store);

  private readonly scores = this.store.selectSignal(AdminRiskScoresState.scores);
  protected readonly scoreRows = computed(() => this.scores().map((score) => this.toRow(score)));
  protected readonly scoresData = this.store.selectSignal(AdminRiskScoresState.scoresConfigs);
  protected readonly isLoading = this.store.selectSignal(AdminRiskScoresState.isLoading);
  protected readonly summary = this.store.selectSignal(AdminRiskScoresState.summary);
  protected readonly categoryOptions = categoryOptions;

  protected readonly isDetailModalVisible = signal(false);
  protected readonly selectedScore = signal<AdminRiskScore | null>(null);

  protected readonly sectionFactors = computed<SectionFactorView[]>(() => {
    const score = this.selectedScore();
    const sectionScores = score?.scoreBreakdown?.['tariaSectionScores'];
    if (!Array.isArray(sectionScores)) {
      return [];
    }

    return sectionScores.filter(this.isSectionScore).map((entry) => ({
      label: entry.label,
      value: entry.value,
      icon: sectionFactorMeta[entry.label]?.icon ?? 'analytics',
      affects: sectionFactorMeta[entry.label]?.affects ?? 'Contributes to the overall Taria risk score.',
    }));
  });

  protected readonly applicationFactors = computed<ApplicationFactorView[]>(() => {
    const breakdown = this.selectedScore()?.scoreBreakdown ?? {};
    return Object.entries(breakdown)
      .filter(([key]) => key in applicationFactorLabels)
      .map(([key, value]) => ({
        label: applicationFactorLabels[key],
        value: typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value),
      }));
  });

  protected readonly categoryMenuItems: MenuItem[] = [
    { label: 'All categories', icon: 'list', command: () => this.onCategoryFilter('') },
    ...categoryOptions.map((option) => ({
      label: option.label,
      icon: option.icon,
      command: () => this.onCategoryFilter(option.value),
    })),
  ];

  private lastEvent: TableLazyLoadEvent = {};
  private searchTerm = '';
  protected selectedCategory = '';

  private readonly searchInput$ = new Subject<string>();

  constructor() {
    this.searchInput$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((value) => {
        this.searchTerm = value;
        this.dispatchLoad({ ...this.lastEvent, first: 0 });
      });
  }

  protected loadScores(event: TableLazyLoadEvent = {}): void {
    this.lastEvent = event;
    this.dispatchLoad();
  }

  protected onSearch(value: string): void {
    this.searchInput$.next(value.trim());
  }

  protected onCategoryFilter(category: string): void {
    this.selectedCategory = category;
    this.dispatchLoad({ ...this.lastEvent, first: 0 });
  }

  protected openDetails(score: AdminRiskScore): void {
    this.selectedScore.set(score);
    this.isDetailModalVisible.set(true);
  }

  protected formatLabel(value: string | null | undefined): string {
    return (
      (value ?? '')
        .replace(/[_-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (letter) => letter.toUpperCase()) || '-'
    );
  }

  private toRow(score: AdminRiskScore): RiskScoreRow {
    const sectionScores = score.scoreBreakdown?.['tariaSectionScores'];
    const factors = Array.isArray(sectionScores)
      ? sectionScores
          .filter((entry): entry is { label: string; value: number } => this.isSectionScore(entry))
          .slice(0, 3)
          .map((entry) => `${entry.label}: ${entry.value}`)
      : Object.entries(score.scoreBreakdown ?? {})
          .slice(0, 3)
          .map(([key, value]) => `${this.formatLabel(key)}: ${typeof value === 'number' ? value : String(value)}`);

    return {
      score,
      categoryLabel: this.formatLabel(score.riskCategory),
      factors,
    };
  }

  private isSectionScore(value: unknown): value is { label: string; value: number } {
    return (
      typeof value === 'object' &&
      value !== null &&
      typeof (value as { label?: unknown }).label === 'string' &&
      typeof (value as { value?: unknown }).value === 'number'
    );
  }

  private dispatchLoad(event: TableLazyLoadEvent = this.lastEvent): void {
    this.lastEvent = event;
    const params: AdminRiskScoresQueryParams = {
      first: event.first ?? 0,
      rows: event.rows ?? 10,
      globalFilter: this.searchTerm || undefined,
      riskCategory: this.selectedCategory || undefined,
    };

    this.store.dispatch(new GetAdminRiskScores(params)).subscribe();
  }
}
