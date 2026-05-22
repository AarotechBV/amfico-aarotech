const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Converts an ISO date (yyyy-MM-dd, what the frontend sends) into the
 * AdminPulse ddMMyyyy format that all upstream date filters expect.
 */
export const isoDateToAdminPulse = (iso: string): string => {
  if (!ISO_DATE_RE.test(iso)) {
    throw new Error(
      `Invalid ISO date "${iso}" — expected yyyy-MM-dd`,
    );
  }
  const [year, month, day] = iso.split('-');
  return `${day}${month}${year}`;
};

export const subtractMonthsIso = (iso: string, months: number): string => {
  if (!ISO_DATE_RE.test(iso)) {
    throw new Error(`Invalid ISO date "${iso}"`);
  }
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setMonth(date.getMonth() - months);
  const yy = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, '0');
  const dd = `${date.getDate()}`.padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
};
