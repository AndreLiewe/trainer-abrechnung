"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  fetchTrainerGroups,
  fetchGroupMembers,
  setProbetrainingBegonnen,
  Gruppe,
  Mitglied,
  setWechselErforderlich,
  updateMitgliedGruppe,
} from "@/lib/groupManagement";
import berechneAlter from "@/lib/utils/berechneAlter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RequireAuth from "@/components/RequireAuth";

export default function TrainerGruppenPage() {
  const [gruppen, setGruppen] = useState<Gruppe[]>([]);
  const [selectedGruppe, setSelectedGruppe] = useState<Gruppe | null>(null);
  const [mitglieder, setMitglieder] = useState<Mitglied[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return;
      const grps = await fetchTrainerGroups(user.email);
      setGruppen(grps);
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedGruppe) return;
    fetchGroupMembers(selectedGruppe.id).then(setMitglieder);
  }, [selectedGruppe]);

   useEffect(() => {
    if (!selectedGruppe) return;
    mitglieder.forEach((m) => {
      const alter = berechneAlter(m.geburtsdatum);
      const wechsel =
        (selectedGruppe.altersgrenze_min !== null &&
          alter < selectedGruppe.altersgrenze_min) ||
        (selectedGruppe.altersgrenze_max !== null &&
          alter > selectedGruppe.altersgrenze_max);
      setWechselErforderlich(m.id, selectedGruppe.id, wechsel).catch(() => {});
    });
  }, [mitglieder, selectedGruppe]);

  const handleProbetraining = async (mitgliedId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await setProbetrainingBegonnen(mitgliedId, user.email!);
    fetchGroupMembers(selectedGruppe!.id).then(setMitglieder);
  };

  const handleWechselUpdate = async (
    mitgliedId: string,
    updates: {
      wechsel_geprüft?: boolean | null;
      bereit_für_wechsel?: boolean | null;
      wechsel_anmerkung?: string | null;
    }
  ) => {
    if (!selectedGruppe) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await updateMitgliedGruppe(mitgliedId, selectedGruppe.id, updates, user.email!);
    setMitglieder((prev) =>
      prev.map((m) => (m.id === mitgliedId ? { ...m, ...updates } : m))
    );
  };


  return (
    <RequireAuth>
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Meine Gruppen</h1>
        <div className="flex gap-2">
          {gruppen.map((g) => (
            <Button
              key={g.id}
              variant={selectedGruppe?.id === g.id ? "default" : "outline"}
              onClick={() => setSelectedGruppe(g)}
            >
              {g.name}
            </Button>
          ))}
        </div>
        {selectedGruppe && (
          <div>
            <h2 className="text-xl font-semibold mb-2">Mitglieder</h2>
            <table className="w-full text-sm border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2">Name</th>
                  <th className="p-2">Alter</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Aktion</th>
                  <th className="p-2">Gruppenwechsel</th>
                </tr>
              </thead>
              <tbody>
                 {mitglieder.map((m) => {
                  const alter = berechneAlter(m.geburtsdatum);
                  const wechsel =
                    (selectedGruppe?.altersgrenze_min !== null &&
                      alter < selectedGruppe.altersgrenze_min) ||
                    (selectedGruppe?.altersgrenze_max !== null &&
                      alter > selectedGruppe.altersgrenze_max);
                  return (
                    <tr
                      key={m.id}
                      className={`border-t ${wechsel ? "bg-red-50" : ""}`}
                    >
                      <td className="p-2">{m.vorname} {m.nachname}</td>
                      <td className="p-2">{alter}</td>
                      <td className="p-2">{m.mitgliedsstatus}</td>
                      <td className="p-2">
                        {!m.status_seit && (
                          <Button size="sm" onClick={() => handleProbetraining(m.id)}>
                            Probetraining begonnen
                          </Button>
                        )}
                      </td>
                         <td className="p-2 space-y-2">
                        {m.wechsel_erforderlich && (
                          <>
                            <label className="flex items-center gap-1">
                              <input
                                type="checkbox"
                                checked={!!m.wechsel_geprüft}
                                onChange={(e) =>
                                  handleWechselUpdate(m.id, { wechsel_geprüft: e.target.checked })
                                }
                              />
                              <span>geprüft</span>
                            </label>
                            <label className="flex items-center gap-1">
                              <input
                                type="checkbox"
                                checked={!!m.bereit_für_wechsel}
                                onChange={(e) =>
                                  handleWechselUpdate(m.id, { bereit_für_wechsel: e.target.checked })
                                }
                              />
                              <span>bereit</span>
                            </label>
                            <Input
                              value={m.wechsel_anmerkung || ""}
                              onChange={(e) =>
                                handleWechselUpdate(m.id, { wechsel_anmerkung: e.target.value })
                              }
                              placeholder="Anmerkung"
                            />
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-8 text-center">
          <Button variant="ghost" onClick={() => window.history.back()}>
            🔙 Zurück
          </Button>
        </div>
      </div>
    </RequireAuth>
  );
}