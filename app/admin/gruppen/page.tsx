"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  fetchGroupMembers,
  updateMitglied,
  addComment,
  Gruppe,
  Mitglied,
} from "@/lib/groupManagement";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import RequireAuth from "@/components/RequireAuth";

export default function AdminGruppenPage() {
  const [gruppen, setGruppen] = useState<Gruppe[]>([]);
  const [selectedGruppe, setSelectedGruppe] = useState<Gruppe | null>(null);
  const [mitglieder, setMitglieder] = useState<Mitglied[]>([]);
  const [kommentare, setKommentare] = useState<Record<string, string>>({});
const [isAdmin, setIsAdmin] = useState(false);

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
    const loadGroups = async () => {
      const { data } = await supabase.from("gruppen").select("*");
      setGruppen(data || []);
    };
    loadGroups();
  }, []);

  useEffect(() => {
    if (!selectedGruppe) return;
    fetchGroupMembers(selectedGruppe.id).then(setMitglieder);
  }, [selectedGruppe]);

  const handleKommentar = async (mitgliedId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const text = kommentare[mitgliedId];
    if (!text) return;
    await addComment(mitgliedId, user.email!, text);
    setKommentare((prev) => ({ ...prev, [mitgliedId]: "" }));
  };

  return (
    <RequireAuth>
      {!isAdmin ? (
        <div className="p-6 text-center">Kein Zugriff ❌</div>
      ) : (
        <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Gruppenverwaltung</h1>
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
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Mitglieder</h2>
            <table className="w-full text-sm border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2">Name</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Aktion</th>
                  <th className="p-2">Kommentar</th>
                </tr>
              </thead>
              <tbody>
                {mitglieder.map((m) => (
                  <tr key={m.id} className="border-t">
                    <td className="p-2">
                      {m.vorname} {m.nachname}
                    </td>
                    <td className="p-2">{m.mitgliedsstatus}</td>
                    <td className="p-2">
                      <Button
                        size="sm"
                        onClick={async () => {
                          const {
                            data: { user },
                          } = await supabase.auth.getUser();
                          if (!user) return;
                          await updateMitglied(
                            m.id,
                            { mitgliedsstatus: "Mitglied" },
                            user.email!
                          );
                          fetchGroupMembers(selectedGruppe.id).then(setMitglieder);
                        }}
                      >
                        Auf &quot;Mitglied&quot; setzen
                      </Button>
                    </td>
                     <td className="p-2 space-y-2">
                      <Textarea
                        value={kommentare[m.id] || ""}
                        onChange={(e) =>
                          setKommentare((prev) => ({
                            ...prev,
                            [m.id]: e.target.value,
                          }))
                        }
                      />
                      <Button size="sm" onClick={() => handleKommentar(m.id)}>
                        Speichern
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

    
          </div>
        )}
      </div>
      )}
    </RequireAuth>
  );
}