export const ABRECHNUNG_STATUS = [
  "offen",
  "erstellt",
  "bezahlt",
  "warten-auf-freigabe",
] as const;

export type AbrechnungStatus = typeof ABRECHNUNG_STATUS[number];
