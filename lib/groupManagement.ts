export type Gruppe = {
  id: string;
  name: string;
  beschreibung: string | null;
  altersgrenze_min: number | null;
  altersgrenze_max: number | null;
  erstellt_am: string;
};

export type Mitglied = {
  id: string;
  vorname: string;
  nachname: string;
  geburtsdatum: string;
  geschlecht: string | null;
  notfalltelefon: string | null;
  mitgliedsstatus: string | null;
  status_seit: string | null;
  bereit_für_wechsel: boolean | null;
  wechsel_anmerkung: string | null;
  erstellt_am: string;
};

import { supabase } from "./supabaseClient";

export async function fetchTrainerGroups(trainerEmail: string) {
  const { data, error } = await supabase
    .from("trainer_gruppen")
    .select("gruppen:gruppen_id(*)")
    .eq("trainer_email", trainerEmail);
  if (error) throw error;
  return (data ?? []).map((g) => g.gruppen as unknown as Gruppe);
}

export async function fetchGroupMembers(gruppenId: string) {
  const { data, error } = await supabase
    .from("mitglied_gruppen")
    .select("mitglieder(*)")
    .eq("gruppen_id", gruppenId);
  if (error) throw error;
  return (data ?? []).map((m) => m.mitglieder as unknown as Mitglied);
}

export async function addComment(
  mitgliedId: string,
  autorEmail: string,
  kommentar: string
) {
  await supabase.from("kommentare").insert({
    mitglied_id: mitgliedId,
    autor_email: autorEmail,
    kommentar,
    zeitpunkt: new Date().toISOString(),
  });
}

async function logChange(
  tabelle: string,
  datensatzId: string,
  feld: string,
  altwert: string | null,
  neuerWert: string | null,
  geaendertVon: string
) {
  await supabase.from("änderungsprotokoll").insert({
    tabelle,
    datensatz_id: datensatzId,
    feld,
    altwert,
    neuer_wert: neuerWert,
    geändert_von: geaendertVon,
    geändert_am: new Date().toISOString(),
  });
}

export async function updateMitglied(
  mitgliedId: string,
  updates: Partial<Mitglied>,
  editorEmail: string
) {
  const { data: oldRecord } = await supabase
    .from("mitglieder")
    .select("*")
    .eq("id", mitgliedId)
    .single();

  const { data, error } = await supabase
    .from("mitglieder")
    .update(updates)
    .eq("id", mitgliedId)
    .select()
    .single();
  if (error) throw error;

  const newRecord = data as Mitglied;
  if (oldRecord) {
    for (const key of Object.keys(updates)) {
      const k = key as keyof Mitglied;
      const oldVal = oldRecord[k] as unknown as string | null;
      const newVal = newRecord[k] as unknown as string | null;
      if (oldVal !== newVal) {
        await logChange(
          "mitglieder",
          mitgliedId,
          key,
          oldVal,
          newVal,
          editorEmail
        );
      }
    }
  }
  return newRecord;
}

export async function setProbetrainingBegonnen(
  mitgliedId: string,
  editorEmail: string
) {
  return updateMitglied(
    mitgliedId,
    { mitgliedsstatus: "Probetraining begonnen", status_seit: new Date().toISOString() },
    editorEmail
  );
}