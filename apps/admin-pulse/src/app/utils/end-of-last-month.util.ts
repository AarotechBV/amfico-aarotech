export const endOfLastMonth = (today: Date = new Date()): Date =>
  new Date(today.getFullYear(), today.getMonth(), 0);
