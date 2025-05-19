export type Abrechnung = {
  id: string;
  datum: string;
  sparte: string;
  beginn: string;
  ende: string;
  hallenfeld: string;
  funktion: string;
  aufbau: boolean;
  trainername: string;
};

export type Standardzeit = {
  sparte: string;
  wochentag: number; // 0=So, 1=Mo ...
  beginn: string;
  ende: string;
  gültig_ab: string;
  gültig_bis?: string;
};

export function pruefeKonflikte(
  eintrag: Abrechnung,
  alle: Abrechnung[],
  ferien: string[],
  standardzeiten: Standardzeit[]
): string[] {
  const konflikte: string[] = [];

  const start1 = new Date(`${eintrag.datum}T${eintrag.beginn}`);
  const end1 = new Date(`${eintrag.datum}T${eintrag.ende}`);
  if (end1 <= start1) end1.setDate(end1.getDate() + 1);

  for (const anderer of alle) {
    if (anderer.id === eintrag.id) continue;

    const start2 = new Date(`${anderer.datum}T${anderer.beginn}`);
    const end2 = new Date(`${anderer.datum}T${anderer.ende}`);
    if (end2 <= start2) end2.setDate(end2.getDate() + 1);

    const gleicheZeit = start1 < end2 && end1 > start2;
    const gleichesFeld = eintrag.hallenfeld === anderer.hallenfeld;
    const gleicheSparte = eintrag.sparte === anderer.sparte;
    const gleicherTag = eintrag.datum === anderer.datum;

    if (gleicherTag && gleicheZeit && gleichesFeld) {
      if (!gleicheSparte) konflikte.push("⚠ Unterschiedliche Sparten");
      if (
        eintrag.funktion === "trainer" &&
        anderer.funktion === "trainer"
      ) {
        konflikte.push("⚠ Zwei Trainer");
      }
    }
  }

  if (ferien.includes(eintrag.datum)) {
    konflikte.push("⚠ Feiertag oder Ferien");
  }

  const wochentag = new Date(eintrag.datum).getDay();
  const standards = standardzeiten.filter(
    (s) =>
      s.sparte === eintrag.sparte &&
      s.wochentag === wochentag &&
      new Date(s.gültig_ab) <= new Date(eintrag.datum) &&
      (!s.gültig_bis || new Date(eintrag.datum) <= new Date(s.gültig_bis))
  );

  const stimmt = standards.some(
    (s) => s.beginn === eintrag.beginn && s.ende === eintrag.ende
  );
  if (!stimmt && standards.length > 0) {
    konflikte.push("⚠ Zeitabweichung vom Standard");
  }

  return konflikte;
}
