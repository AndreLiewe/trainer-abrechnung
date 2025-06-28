export const SPARTEN = [
  "Judo",
  "Kinderturnen",
  "Zirkeltraining",
  "Eltern-Kind-Turnen",
  "Leistungsturnen",
  "Turntraining im Parcours",
];

export const MITGLIEDSSTATUS = [
  "Probetraining eingeladen",
  "Probetraining begonnen",
  "Zur Mitgliedschaft eingeladen",
  "Mitglied",
  "Gekündigt",
] as const;

export type Mitgliedsstatus = typeof MITGLIEDSSTATUS[number];
