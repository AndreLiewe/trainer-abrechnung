"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  fetchTrainerGroups,
  fetchGroupMembers,
  setProbetrainingBegonnen,
  Gruppe,
  Mitglied,
} from "@/lib/groupManagement";
import { Button } from "@/components/ui/button";
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

  const handleProbetraining = async (mitgliedId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await setProbetrainingBegonnen(mitgliedId, user.email!);
    fetchGroupMembers(selectedGruppe!.id).then(setMitglieder);
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
                  <th className="p-2">Status</th>
                  <th className="p-2">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {mitglieder.map((m) => (
                  <tr key={m.id} className="border-t">
                    <td className="p-2">{m.vorname} {m.nachname}</td>
                    <td className="p-2">{m.mitgliedsstatus}</td>
                    <td className="p-2">
                      {!m.status_seit && (
                        <Button size="sm" onClick={() => handleProbetraining(m.id)}>
                          Probetraining begonnen
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </RequireAuth>
  );
}