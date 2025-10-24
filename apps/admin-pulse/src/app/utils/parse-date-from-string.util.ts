export const parseDateFromString = (dateStr?: string): Date | null => {
  if (!dateStr) return null;

  const day = parseInt(dateStr.slice(0, 2), 10);
  const month = parseInt(dateStr.slice(2, 4), 10) - 1; // 0-based
  const year = parseInt(dateStr.slice(4, 8), 10);
  return new Date(year, month, day);
};
