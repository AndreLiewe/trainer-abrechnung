export type Satz = {
  funktion: string;
  stundenlohn: number;
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

  let endeMin = hEnde * 60 + mEnde;
  const beginnMin = hBeginn * 60 + mBeginn;
  if (endeMin < beginnMin) endeMin += 1440;

  const dauer = (endeMin - beginnMin) / 60;

  const passendeSaetze = saetze
    .filter(
  (s) =>
    s.funktion.toLowerCase() === funktion.toLowerCase() &&
    new Date(s.gültig_ab) <= new Date(datum)
)
    .sort(
      (a, b) =>
        new Date(b.gültig_ab).getTime() -
        new Date(a.gültig_ab).getTime()
    );

  const satz = passendeSaetze[0];

  if (!satz) {
    console.warn(
      "[WARN] Kein gültiger Vergütungssatz gefunden für:",
      funktion,
      "am",
      datum
    );
    return 0;
  }

  return (dauer + (aufbau ? 0.5 : 0)) * satz.stundenlohn;

}
