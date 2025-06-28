"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Gruppe,
  Mitglied,
  moveMitgliedToGruppe,
  removeMitgliedFromGruppe,
  createMitglied,
  deleteMitglied,
} from "@/lib/groupManagement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RequireAuth from "@/components/RequireAuth";
import { useConfirm } from "@/components/ConfirmDialog";

interface MitgliedRow extends Mitglied {
  gruppen_ids: string[];
}

type MitgliedWithGroup = Mitglied & {
  mitglied_gruppen: { gruppen_id: string }[] | null;
};

export default function AdminMitgliederPage() {
  const [mitglieder, setMitglieder] = useState<MitgliedRow[]>([]);
  const [gruppen, setGruppen] = useState<Gruppe[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [formData, setFormData] = useState({
    vorname: "",
    nachname: "",
    geburtsdatum: "",
    gruppen_ids: [] as string[],
  });
  const confirm = useConfirm();

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        const { data, error } = await supabase
          .from("admin_users")
          .select("email")
          .eq("email", user.email)
          .single();
        if (data && !error) setIsAdmin(true);
      }
    };
    checkUser();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    const load = async () => {
      const { data } = await supabase
        .from("mitglieder")
        .select("*, mitglied_gruppen(gruppen_id)");
      const list = ((data as MitgliedWithGroup[]) || []).map(
        ({ mitglied_gruppen, ...rest }) => ({
          ...rest,
          gruppen_ids: mitglied_gruppen?.map((g) => g.gruppen_id) ?? [],
        })
      );
      setMitglieder(list);
      const { data: g } = await supabase.from("gruppen").select("*");
      setGruppen(g || []);
    };
    load();
  }, [isAdmin]);

  const handleCreate = async () => {
    if (
      !formData.vorname ||
      !formData.nachname ||
      !formData.geburtsdatum ||
      formData.gruppen_ids.length === 0
    ) {
      alert("Bitte alle Felder ausfüllen und mindestens eine Gruppe auswählen.");
      return;
    }

    const neu = await createMitglied({
      vorname: formData.vorname,
      nachname: formData.nachname,
      geburtsdatum: formData.geburtsdatum,
    });

    await Promise.all(
      formData.gruppen_ids.map((gid) => moveMitgliedToGruppe(neu.id, gid))
    );

    setMitglieder([...mitglieder, { ...neu, gruppen_ids: formData.gruppen_ids }]);
    setFormData({ vorname: "", nachname: "", geburtsdatum: "", gruppen_ids: [] });
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({ message: "Mitglied wirklich löschen?" });
    if (!ok) return;
    await deleteMitglied(id);
    setMitglieder((prev) => prev.filter((m) => m.id !== id));
  };

  const handleToggleGroup = async (
    id: string,
    gruppe: string,
    checked: boolean
  ) => {
    if (checked) {
      await moveMitgliedToGruppe(id, gruppe);
      setMitglieder((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, gruppen_ids: [...m.gruppen_ids, gruppe] } : m
        )
      );
    } else {
      await removeMitgliedFromGruppe(id, gruppe);
      setMitglieder((prev) =>
        prev.map((m) =>
          m.id === id
            ? { ...m, gruppen_ids: m.gruppen_ids.filter((g) => g !== gruppe) }
            : m
        )
      );
    }
  };

  return (
    <RequireAuth>
      {!isAdmin ? (
        <div className="p-6 text-center">Kein Zugriff ❌</div>
      ) : (
        <div className="p-6 space-y-4">
          <h1 className="text-2xl font-bold">Mitgliederverwaltung</h1>

          <div className="border rounded p-4 space-y-2">
            <h2 className="text-lg font-semibold">Neues Mitglied</h2>
            <Input
              placeholder="Vorname"
              value={formData.vorname}
              onChange={(e) => setFormData({ ...formData, vorname: e.target.value })}
            />
            <Input
              placeholder="Nachname"
              value={formData.nachname}
              onChange={(e) => setFormData({ ...formData, nachname: e.target.value })}
            />
            <Input
              type="date"
              placeholder="Geburtsdatum"
              value={formData.geburtsdatum}
              onChange={(e) =>
                setFormData({ ...formData, geburtsdatum: e.target.value })
              }
            />
            <div className="flex flex-wrap gap-2">
              {gruppen.map((g) => (
                <label key={g.id} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={formData.gruppen_ids.includes(g.id)}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        gruppen_ids: e.target.checked
                          ? [...prev.gruppen_ids, g.id]
                          : prev.gruppen_ids.filter((id) => id !== g.id),
                      }));
                    }}
                  />
                  <span>{g.name}</span>
                </label>
              ))}
            </div>
            <Button onClick={handleCreate}>Anlegen</Button>
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Mitglieder</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2">Name</th>
                    <th className="p-2">Geburtsdatum</th>
                    <th className="p-2">Gruppe</th>
                    <th className="p-2">Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {mitglieder.map((m) => (
                    <tr key={m.id} className="border-t">
                      <td className="p-2">
                        {m.vorname} {m.nachname}
                      </td>
                      <td className="p-2">{m.geburtsdatum}</td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-2">
                          {gruppen.map((g) => (
                            <label key={g.id} className="flex items-center gap-1">
                              <input
                                type="checkbox"
                                checked={m.gruppen_ids.includes(g.id)}
                                onChange={(e) =>
                                  handleToggleGroup(m.id, g.id, e.target.checked)
                                }
                              />
                              <span>{g.name}</span>
                            </label>
                          ))}
                        </div>
                      </td>
                      <td className="p-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(m.id)}
                        >
                          Löschen
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Button variant="ghost" onClick={() => window.history.back()}>
              🔙 Zurück
            </Button>
          </div>
        </div>
      )}
    </RequireAuth>
  );
}
