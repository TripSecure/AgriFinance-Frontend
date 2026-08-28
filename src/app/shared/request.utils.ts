import { HttpErrorResponse, HttpParams } from '@angular/common/http';

export interface PagedQueryParams {
  first?: number;
  rows?: number;
  globalFilter?: string;
  sortField?: string;
  sortOrder?: number;
  status?: string;
}

export interface PagedData<T> {
  totalPages?: number;
  pageIndex?: number;
  pageSize?: number;
  totalCount?: number;
  pagination?: {
    totalPages?: number;
    page?: number;
    pageIndex?: number;
    pageSize?: number;
    limit?: number;
    total?: number;
    totalCount?: number;
  };
  results?: T[];
  items?: T[];
  data?: T[];
}

export interface NormalizedPage<T> {
  results: T[];
  totalPages: number;
  pageIndex: number;
  pageSize: number;
  totalCount: number;
}

export const buildListParams = (params?: PagedQueryParams): HttpParams => {
  let httpParams = new HttpParams();

  if (!params) {
    return httpParams;
  }

  const pageSize = params.rows ?? 10;
  const pageIndex = Math.floor((params.first ?? 0) / pageSize) + 1;

  httpParams = httpParams.set('pageIndex', String(pageIndex));
  httpParams = httpParams.set('pageSize', String(pageSize));

  if (params.globalFilter) {
    httpParams = httpParams.set('search', params.globalFilter);
  }

  if (params.status) {
    httpParams = httpParams.set('status', params.status);
  }

  if (params.sortField) {
    httpParams = httpParams.set('sortBy', params.sortField);
    httpParams = httpParams.set('sortOrder', params.sortOrder === -1 ? 'desc' : 'asc');
  }

  return httpParams;
};

export const normalizeListResponse = <T>(data: PagedData<T> | T[]): NormalizedPage<T> => {
  if (Array.isArray(data)) {
    return {
      results: data,
      totalPages: 1,
      pageIndex: 1,
      pageSize: data.length,
      totalCount: data.length,
    };
  }

  const results = data.results ?? data.items ?? data.data ?? [];
  const pagination = data.pagination;

  return {
    results,
    totalPages: data.totalPages ?? pagination?.totalPages ?? 1,
    pageIndex: data.pageIndex ?? pagination?.pageIndex ?? pagination?.page ?? 1,
    pageSize: data.pageSize ?? pagination?.pageSize ?? pagination?.limit ?? results.length,
    totalCount: data.totalCount ?? pagination?.totalCount ?? pagination?.total ?? results.length,
  };
};

export const hasMessage = (value: unknown): value is { message: string } =>
  typeof value === 'object' &&
  value !== null &&
  'message' in value &&
  typeof (value as { message: unknown }).message === 'string';

export const extractErrorMessage = (error: unknown, fallbackMessage: string): string => {
  if (error instanceof HttpErrorResponse) {
    if (hasMessage(error.error)) {
      return error.error.message;
    }

    if (typeof error.error === 'string') {
      return error.error;
    }

    if (error.message) {
      return error.message;
    }
  }

  return fallbackMessage;
};

export const extractResponseErrors = (
  response: { errors?: unknown; error?: unknown; message?: string | null },
  fallbackMessage: string,
): string[] => {
  if (Array.isArray(response.errors)) {
    return response.errors.filter((error): error is string => typeof error === 'string');
  }

  if (typeof response.errors === 'string') {
    return [response.errors];
  }

  if (typeof response.error === 'string') {
    return [response.error];
  }

  if (hasMessage(response.error)) {
    return [response.error.message];
  }

  if (response.message) {
    return [response.message];
  }

  return [fallbackMessage];
};
