import { supabaseAdmin } from "./supabaseAdmin";
import { differenceInYears, isValid } from "date-fns";

interface Mitglied {
  id: string;
  vorname: string;
  nachname: string;
  geburtsdatum: string;
}

interface Gruppe {
  id: string;
  name: string;
  altersgrenze_max: number | null;
}

interface MitgliedGruppeRow {
  id: string;
  mitglieder: Mitglied | null;
  gruppen: Gruppe | Gruppe[] | null;
}

/**
 * Durchsucht alle Einträge der Tabelle `mitglied_gruppen` und
 * prüft, ob das jeweilige Mitglied die Altersgrenze der Gruppe überschreitet.
 * Bei Überschreitung werden entsprechende Felder gesetzt, so dass ein
 * Gruppenwechsel vermerkt wird.
 */
export async function pruefeGruppenWechsel() {
  console.log("[INFO] Starte Altersgrenzen-Prüfung");

  const { data, error } = await supabaseAdmin
    .from("mitglied_gruppen")
    .select(
      "id, mitglieder(id, vorname, nachname, geburtsdatum), gruppen(id, name, altersgrenze_max)"
    );

  if (error) {
    console.error("[ERROR] Laden der Verknüpfungen fehlgeschlagen:", error.message);
    throw error;
  }

  if (!data) {
    console.log("[WARN] Keine Verknüpfungen gefunden");
    return;
  }

  const rows = data as MitgliedGruppeRow[];

  for (const eintrag of rows) {
    const gruppeData = Array.isArray(eintrag.gruppen)
      ? eintrag.gruppen[0]
      : eintrag.gruppen;
    const mitglied = eintrag.mitglieder;
    const gruppe = gruppeData;

    if (!mitglied || !gruppe || gruppe.altersgrenze_max === null) {
      continue;
    }

    const geburt = new Date(mitglied.geburtsdatum);
    if (!isValid(geburt)) {
      console.warn(`[WARN] Ungültiges Geburtsdatum bei Mitglied ${mitglied.id}`);
      continue;
    }

    const alter = differenceInYears(new Date(), geburt);
    if (alter > gruppe.altersgrenze_max) {
      console.log(
        `[INFO] ${mitglied.vorname} ${mitglied.nachname} (${alter} Jahre) überschreitet ` +
          `die Altersgrenze ${gruppe.altersgrenze_max} der Gruppe ${gruppe.name}`
      );

      const { error: updateError } = await supabaseAdmin
        .from("mitglied_gruppen")
        .update({
          wechsel_erforderlich: true,
          bereit_für_wechsel: null,
          wechsel_geprüft: false,
          wechsel_anmerkung: null,
        })
        .eq("id", eintrag.id);

      if (updateError) {
        console.error(
          `[ERROR] Aktualisierung fehlgeschlagen (ID ${eintrag.id}):`,
          updateError.message
        );
      } else {
        console.log(`[INFO] Eintrag ${eintrag.id} aktualisiert.`);
      }
    }
  }

  console.log("[INFO] Altersgrenzen-Prüfung abgeschlossen");
}
