export type Gruppe = {
  id: string;
  name: string;
  beschreibung: string | null;
  altersgrenze_min: number | null;
  altersgrenze_max: number | null;
  erstellt_am: string;
};

import type { Mitgliedsstatus } from "./constants";

export type Mitglied = {
  id: string;
  vorname: string;
  nachname: string;
  geburtsdatum: string;
  geschlecht: string | null;
  notfalltelefon: string | null;
  mitgliedsstatus: Mitgliedsstatus | null;
  status_seit: string | null;
  bereit_für_wechsel: boolean | null;
  wechsel_anmerkung: string | null;
  wechsel_geprüft: boolean | null;
  wechsel_erforderlich: boolean | null;
  erstellt_am: string;
};

export type MitgliedMitGruppen = Mitglied & { gruppen_ids: string[] };

import { supabase } from "./supabaseClient";

export async function fetchTrainerGroups(trainerEmail: string) {
  const { data, error } = await supabase
    .from("trainer_gruppen")
    .select("gruppen:gruppen_id(*)")
    .eq("trainer_email", trainerEmail);
  if (error) throw error;
  return (data ?? []).map((g) => g.gruppen as unknown as Gruppe);
}

export async function fetchGroupMembers(gruppenId: string): Promise<MitgliedMitGruppen[]> {
  const { data, error } = await supabase
    .from("mitglied_gruppen")
    .select(
      '"wechsel_geprüft","bereit_für_wechsel","wechsel_anmerkung","wechsel_erforderlich",mitglieder(id,vorname,nachname,geburtsdatum,geschlecht,notfalltelefon,mitgliedsstatus,status_seit, mitglied_gruppen(gruppen_id))'
    )
    .eq("gruppen_id", gruppenId);
  if (error) throw error;
  return (data ?? []).map((m) => ({
    ...(m.mitglieder as unknown as Mitglied),
    gruppen_ids:
      ((m.mitglieder as any).mitglied_gruppen as { gruppen_id: string }[] | null)?.map(
        (mg) => mg.gruppen_id
      ) ?? [],
    wechsel_geprüft: m.wechsel_geprüft as boolean | null,
    bereit_für_wechsel: m.bereit_für_wechsel as boolean | null,
    wechsel_anmerkung: m.wechsel_anmerkung as string | null,
    wechsel_erforderlich: m.wechsel_erforderlich as boolean | null,
  }));
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

export type Kommentar = {
  id: string;
  mitglied_id: string;
  autor_email: string | null;
  kommentar: string;
  zeitpunkt: string;
};

export async function fetchKommentare(mitgliedId: string) {
  const { data, error } = await supabase
    .from("kommentare")
    .select("*")
    .eq("mitglied_id", mitgliedId)
    .order("zeitpunkt", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Kommentar[];
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
    {
      mitgliedsstatus: "Probetraining begonnen",
      status_seit: new Date().toISOString(),
    },
    editorEmail
  );

  }
export async function setWechselErforderlich(
  mitgliedId: string,
  gruppenId: string,
  wechsel_erforderlich: boolean
) {
  const { error } = await supabase
    .from("mitglied_gruppen")
    .update({ wechsel_erforderlich })
    .eq("mitglied_id", mitgliedId)
    .eq("gruppen_id", gruppenId);
  if (error) throw error;
  }

export async function updateMitgliedGruppe(
  mitgliedId: string,
  gruppenId: string,
  updates: {
    wechsel_geprüft?: boolean | null;
    bereit_für_wechsel?: boolean | null;
    wechsel_anmerkung?: string | null;
  },
  editorEmail: string
) {
  const { data: oldRecord } = await supabase
    .from("mitglied_gruppen")
    .select("*")
    .eq("mitglied_id", mitgliedId)
    .eq("gruppen_id", gruppenId)
    .single();

  const { data, error } = await supabase
    .from("mitglied_gruppen")
    .update(updates)
    .eq("mitglied_id", mitgliedId)
    .eq("gruppen_id", gruppenId)
    .select()
    .single();
  if (error) throw error;

  const newRecord = data as typeof updates & Record<string, unknown>;
  if (oldRecord) {
    for (const key of Object.keys(updates)) {
      const oldVal = oldRecord[key] as unknown as string | null;
      const newVal = newRecord[key] as unknown as string | null;
      if (oldVal !== newVal) {
        await logChange(
          "mitglied_gruppen",
          `${mitgliedId}/${gruppenId}`,
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

export async function createMitglied(
  data: Pick<Mitglied, "vorname" | "nachname" | "geburtsdatum"> &
    Partial<Omit<Mitglied, "id" | "erstellt_am">>
) {
  const { data: rec, error } = await supabase
    .from("mitglieder")
    .insert({
      vorname: data.vorname,
      nachname: data.nachname,
      geburtsdatum: data.geburtsdatum,
      geschlecht: data.geschlecht ?? null,
      notfalltelefon: data.notfalltelefon ?? null,
      mitgliedsstatus: data.mitgliedsstatus ?? "Probetraining eingeladen",
    })
    .select()
    .single();
  if (error) throw error;
  return rec as Mitglied;
}

export async function deleteMitglied(mitgliedId: string) {
  await supabase.from("mitglied_gruppen").delete().eq("mitglied_id", mitgliedId);
  const { error } = await supabase
    .from("mitglieder")
    .delete()
    .eq("id", mitgliedId);
  if (error) throw error;
}

export async function moveMitgliedToGruppe(
  mitgliedId: string,
  gruppenId: string
) {
  
  const { error } = await supabase
    .from("mitglied_gruppen")
    .upsert({ mitglied_id: mitgliedId, gruppen_id: gruppenId }, {
      onConflict: "mitglied_id,gruppen_id",
    });
  if (error) throw error;
}

export async function removeMitgliedFromGruppe(
  mitgliedId: string,
  gruppenId: string
) {
  const { error } = await supabase
    .from("mitglied_gruppen")
    .delete()
    .eq("mitglied_id", mitgliedId)
    .eq("gruppen_id", gruppenId);
  if (error) throw error;
}

