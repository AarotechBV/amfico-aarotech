export interface PageDto<T> {
  results: T[];
  currentPage: number;
  pageCount: number;
  pageSize: number;
  totalRowCount: number;
}
