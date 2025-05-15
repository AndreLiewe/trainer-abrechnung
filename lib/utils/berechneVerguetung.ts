type Satz = {
  funktion: string;
  stundenlohn: number;
  aufbau_bonus: number;
  gültig_ab: string;
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
  if (endeMin < beginnMin) endeMin += 24 * 60;

  let dauer = (endeMin - beginnMin) / 60;
  if (aufbau) dauer += 0.5;

  const satz = saetze
    .filter((s) => s.funktion === funktion && new Date(s.gültig_ab) <= new Date(datum)
)
    .sort((a, b) => b.gültig_ab.localeCompare(a.gültig_ab))[0];

  const stundenlohn = satz?.stundenlohn ?? 0;
  const bonus = satz?.aufbau_bonus ?? 0;

  return dauer * stundenlohn + (aufbau ? bonus : 0);
}
