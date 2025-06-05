export const MONTH_NAMES_DE = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

export function generateYearRange(yearsBack: number, yearsForward: number): number[] {
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - yearsBack;
  const endYear = currentYear + yearsForward;
  const years: number[] = [];
  for (let year = startYear; year <= endYear; year++) {
    years.push(year);
  }
  return years;
}
