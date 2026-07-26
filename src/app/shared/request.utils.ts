import { HttpParams } from '@angular/common/http';

export interface ParamConfig {
  pageIndex?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

interface LazyLoadLikeEvent {
  first?: number | null;
  rows?: number | null;
  globalFilter?: string | string[] | null;
  sortField?: string | string[] | null;
  sortOrder?: number | null;
}

export const generateParams = (event: LazyLoadLikeEvent = {}): ParamConfig => {
  const pageSize = event.rows ?? 10;
  const pageIndex = Math.floor((event.first ?? 0) / pageSize) + 1;
  const sortField = Array.isArray(event.sortField) ? event.sortField[0] : event.sortField;
  const globalFilter = Array.isArray(event.globalFilter)
    ? event.globalFilter[0]
    : event.globalFilter;

  return {
    pageIndex,
    pageSize,
    search: globalFilter || undefined,
    sortBy: sortField || undefined,
    sortOrder: event.sortOrder === -1 ? 'desc' : 'asc',
  };
};

export const setParams = (param?: ParamConfig): HttpParams => {
  let params = new HttpParams();

  if (!param) {
    return params;
  }

  Object.entries(param).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params = params.set(key, String(value));
    }
  });

  return params;
};
