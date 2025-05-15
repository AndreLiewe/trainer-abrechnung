export type Satz = {
  funktion: string;
  stundenlohn: number;
  aufbau_bonus: number;
  gültig_ab: string; // ISO-String z. B. "2025-04-01"
};

export function berechneVerguetung(
  beginn: string,
  ende: string,
  aufbau: boolean,
  funktion: string,
  datum: string,
  saetze: Satz[]
): number {
  const [hBeginn, mBeginn] = beginn.split(":").map(Number);
  const [hEnde, mEnde] = ende.split(":").map(Number);

  const beginnMin = hBeginn * 60 + mBeginn;
  let endeMin = hEnde * 60 + mEnde;
  if (endeMin < beginnMin) endeMin += 1440; // über Mitternacht

  const dauer = (endeMin - beginnMin) / 60;

  const gültigeSaetze = saetze
    .filter(
      (s) => s.funktion === funktion && new Date(s.gültig_ab) <= new Date(datum)
    )
    .sort((a, b) => new Date(b.gültig_ab).getTime() - new Date(a.gültig_ab).getTime());

  const satz = gültigeSaetze[0];

  if (!satz) {
    console.warn("[WARN] Kein gültiger Satz gefunden für", funktion, datum);
    return 0;
  }

  return dauer * satz.stundenlohn + (aufbau ? satz.aufbau_bonus : 0);
}
