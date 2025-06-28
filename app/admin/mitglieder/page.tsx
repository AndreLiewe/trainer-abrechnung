"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Gruppe, Mitglied } from "@/lib/groupManagement";
import {
  moveMitgliedToGruppe,
  createMitglied,
  deleteMitglied,
} from "@/lib/groupManagement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import RequireAuth from "@/components/RequireAuth";
import { useConfirm } from "@/components/ConfirmDialog";

interface MitgliedRow extends Mitglied {
  gruppen_id: string | null;
}

export default function AdminMitgliederPage() {
  const [mitglieder, setMitglieder] = useState<MitgliedRow[]>([]);
  const [gruppen, setGruppen] = useState<Gruppe[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [formData, setFormData] = useState({
    vorname: "",
    nachname: "",
    geburtsdatum: "",
    gruppen_id: "",
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
      const list = (data || []).map((m: any) => ({
        ...(m as Mitglied),
        gruppen_id: m.mitglied_gruppen?.[0]?.gruppen_id ?? null,
      }));
      setMitglieder(list);
      const { data: g } = await supabase.from("gruppen").select("*");
      setGruppen(g || []);
    };
    load();
  }, [isAdmin]);

  const handleCreate = async () => {
    if (!formData.vorname || !formData.nachname || !formData.geburtsdatum || !formData.gruppen_id)
      return;
    const neu = await createMitglied({
      vorname: formData.vorname,
      nachname: formData.nachname,
      geburtsdatum: formData.geburtsdatum,
    });
    await moveMitgliedToGruppe(neu.id, formData.gruppen_id);
    setMitglieder([...mitglieder, { ...neu, gruppen_id: formData.gruppen_id }]);
    setFormData({ vorname: "", nachname: "", geburtsdatum: "", gruppen_id: "" });
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({ message: "Mitglied wirklich löschen?" });
    if (!ok) return;
    await deleteMitglied(id);
    setMitglieder((prev) => prev.filter((m) => m.id !== id));
  };

  const handleMove = async (id: string, gruppe: string) => {
    await moveMitgliedToGruppe(id, gruppe);
    setMitglieder((prev) =>
      prev.map((m) => (m.id === id ? { ...m, gruppen_id: gruppe } : m))
    );
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
            <Select
              value={formData.gruppen_id}
              onValueChange={(val) => setFormData({ ...formData, gruppen_id: val })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Gruppe wählen" />
              </SelectTrigger>
              <SelectContent>
                {gruppen.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleCreate}>Anlegen</Button>
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Mitglieder</h2>
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
                      <Select
                        value={m.gruppen_id || ""}
                        onValueChange={(val) => handleMove(m.id, val)}
                      >
                        <SelectTrigger size="sm">
                          <SelectValue placeholder="-" />
                        </SelectTrigger>
                        <SelectContent>
                          {gruppen.map((g) => (
                            <SelectItem key={g.id} value={g.id}>
                              {g.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
      )}
    </RequireAuth>
  );
}