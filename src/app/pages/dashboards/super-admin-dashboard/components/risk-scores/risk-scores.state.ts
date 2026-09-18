import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../../../../environment/environment';
import { extractErrorMessage, normalizeListResponse } from '../../../../../shared/request.utils';

export interface AdminRiskScore extends Record<string, unknown> {
  id: string;
  farmerId: string;
  farmerName: string;
  score: number;
  riskCategory: string;
  premiumCategory: string;
  loanEligibilityPercent: number;
  region: string | null;
  cropType: string | null;
  scoreBreakdown: Record<string, unknown>;
  scoredAt: string;
}

export interface RiskDistributionEntry {
  category: string;
  count: number;
  percent: number;
}

interface AdminRiskScoresSummary {
  totalScored: number;
  riskDistribution: RiskDistributionEntry[];
}

interface AdminRiskScoresResponse {
  message?: string;
  success?: boolean;
  data: {
    summary?: AdminRiskScoresSummary;
    filters?: { regions?: string[]; cropTypes?: string[] };
    items?: AdminRiskScore[];
    pagination?: Record<string, unknown>;
  };
}

export interface AdminRiskScoresQueryParams {
  first?: number;
  rows?: number;
  globalFilter?: string;
  riskCategory?: string;
  region?: string;
  cropType?: string;
}

export interface AdminRiskScoresStateModel {
  scores: AdminRiskScore[];
  totalPages: number;
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  isLoading: boolean;
  errors: string[];
  summary: AdminRiskScoresSummary | null;
}

export class GetAdminRiskScores {
  static readonly type = '[Admin Risk Scores] Get Scores';
  constructor(public params?: AdminRiskScoresQueryParams) {}
}

@State<AdminRiskScoresStateModel>({
  name: 'adminRiskScores',
  defaults: {
    scores: [],
    totalPages: 0,
    pageIndex: 0,
    pageSize: 10,
    totalCount: 0,
    isLoading: false,
    errors: [],
    summary: null,
  },
})
@Injectable()
export class AdminRiskScoresState {
  private readonly http = inject(HttpClient);

  @Selector()
  static isLoading(state: AdminRiskScoresStateModel): boolean {
    return state.isLoading;
  }

  @Selector()
  static errors(state: AdminRiskScoresStateModel): string[] {
    return state.errors;
  }

  @Selector()
  static scores(state: AdminRiskScoresStateModel): AdminRiskScore[] {
    return state.scores;
  }

  @Selector()
  static scoresConfigs(state: AdminRiskScoresStateModel) {
    const { totalPages, pageIndex, pageSize, totalCount } = state;
    return { totalPages, pageIndex, pageSize, totalCount };
  }

  @Selector()
  static summary(state: AdminRiskScoresStateModel): AdminRiskScoresSummary | null {
    return state.summary;
  }

  @Action(GetAdminRiskScores)
  getScores(ctx: StateContext<AdminRiskScoresStateModel>, { params }: GetAdminRiskScores) {
    ctx.patchState({ isLoading: true, errors: [] });

    let httpParams = new HttpParams();
    httpParams = httpParams.set('limit', String(params?.rows ?? 10)).set('offset', String(params?.first ?? 0));
    if (params?.globalFilter) httpParams = httpParams.set('search', params.globalFilter);
    if (params?.riskCategory) httpParams = httpParams.set('riskCategory', params.riskCategory);
    if (params?.region) httpParams = httpParams.set('region', params.region);
    if (params?.cropType) httpParams = httpParams.set('cropType', params.cropType);

    return this.http.get<AdminRiskScoresResponse>(`${environment.api}/admin/risk-scores`, { params: httpParams }).pipe(
      tap((response) => {
        const data = normalizeListResponse(response.data);
        ctx.patchState({
          scores: data.results,
          totalPages: data.totalPages,
          pageIndex: data.pageIndex,
          pageSize: data.pageSize,
          totalCount: data.totalCount,
          summary: response.data.summary ?? null,
          isLoading: false,
        });
      }),
      catchError((error: unknown) => {
        ctx.patchState({
          isLoading: false,
          errors: [extractErrorMessage(error, 'Unable to load risk scores.')],
        });
        return of(error);
      }),
    );
  }
}
