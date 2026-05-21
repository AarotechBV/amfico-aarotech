import { PageDto } from '@amfico@aarotech/admin-pulse-shared';
import { ADMIN_PULSE_DEFAULT_PAGE_SIZE } from './admin-pulse.constants';

/**
 * Calls a paginated AdminPulse endpoint until all pages are exhausted and
 * returns the concatenated results.
 */
export const fetchAllPages = async <T>(
  fetchPage: (page: number, pageSize: number) => Promise<PageDto<T>>,
  pageSize: number = ADMIN_PULSE_DEFAULT_PAGE_SIZE,
): Promise<T[]> => {
  const results: T[] = [];
  let page = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const response = await fetchPage(page, pageSize);
    results.push(...response.results);
    if (response.currentPage >= response.pageCount - 1) {
      return results;
    }
    page = response.currentPage + 1;
  }
};
