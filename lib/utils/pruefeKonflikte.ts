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
  wochentag: number; // 0 = Sonntag
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
  if (end1 <= start1) end1.setDate(end1.getDate() + 1); // Mitternacht-Überlauf

  for (const anderer of alle) {
    if (anderer.id === eintrag.id) continue;
    if (eintrag.datum !== anderer.datum) continue;

    const start2 = new Date(`${anderer.datum}T${anderer.beginn}`);
    const end2 = new Date(`${anderer.datum}T${anderer.ende}`);
    if (end2 <= start2) end2.setDate(end2.getDate() + 1);

    const überschneidung = start1 < end2 && end1 > start2;

    if (überschneidung && eintrag.hallenfeld === anderer.hallenfeld) {
      if (eintrag.sparte !== anderer.sparte) {
        konflikte.push("⚠ Unterschiedliche Sparten auf gleichem Feld");
      }
      if (
        eintrag.funktion === "trainer" &&
        anderer.funktion === "trainer"
      ) {
        konflikte.push("⚠ Zwei Trainer gleichzeitig auf einem Feld");
      }
    }
  }

  if (ferien.includes(eintrag.datum)) {
    konflikte.push("⚠ Termin liegt in Ferien/Feiertag");
  }

  const wochentag = new Date(eintrag.datum).getDay();
  const standard = standardzeiten.filter((s) =>
    s.sparte === eintrag.sparte &&
    s.wochentag === wochentag &&
    new Date(s.gültig_ab) <= new Date(eintrag.datum) &&
    (!s.gültig_bis || new Date(eintrag.datum) <= new Date(s.gültig_bis))
  );

  const passt = standard.some(s =>
    s.beginn === eintrag.beginn && s.ende === eintrag.ende
  );

  if (standard.length > 0 && !passt) {
    konflikte.push("⚠ Zeit stimmt nicht mit Standardzeit überein");
  }

  return konflikte;
}
