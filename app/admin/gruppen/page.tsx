"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  fetchGroupMembers,
  updateMitglied,
  addComment,
  Gruppe,
  Mitglied,
  setWechselErforderlich,
} from "@/lib/groupManagement";
import berechneAlter from "@/lib/utils/berechneAlter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { useConfirm } from "@/components/ConfirmDialog";
import RequireAuth from "@/components/RequireAuth";

export default function AdminGruppenPage() {
  const [gruppen, setGruppen] = useState<Gruppe[]>([]);
  const [selectedGruppe, setSelectedGruppe] = useState<Gruppe | null>(null);
  const [mitglieder, setMitglieder] = useState<Mitglied[]>([]);
  const [kommentare, setKommentare] = useState<Record<string, string>>({});
const [isAdmin, setIsAdmin] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    beschreibung: "",
    altersgrenze_min: "",
    altersgrenze_max: "",
  });
  const [formOpen, setFormOpen] = useState(false);
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
  
  useEffect(() => {
    if (!selectedGruppe) {
      setFormData({ name: "", beschreibung: "", altersgrenze_min: "", altersgrenze_max: "" });
      return;
    }
    setFormData({
      name: selectedGruppe.name,
      beschreibung: selectedGruppe.beschreibung || "",
      altersgrenze_min: selectedGruppe.altersgrenze_min?.toString() || "",
      altersgrenze_max: selectedGruppe.altersgrenze_max?.toString() || "",
    });
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

   const handleNew = () => {
    setSelectedGruppe(null);
    setFormData({ name: "", beschreibung: "", altersgrenze_min: "", altersgrenze_max: "" });
    setFormOpen(true);
  };

  const handleSave = async () => {
    const min = formData.altersgrenze_min ? Number(formData.altersgrenze_min) : null;
    const max = formData.altersgrenze_max ? Number(formData.altersgrenze_max) : null;
    if (selectedGruppe) {
      await supabase
        .from("gruppen")
        .update({ name: formData.name, beschreibung: formData.beschreibung || null, altersgrenze_min: min, altersgrenze_max: max })
        .eq("id", selectedGruppe.id);
    } else {
      await supabase.from("gruppen").insert({ name: formData.name, beschreibung: formData.beschreibung || null, altersgrenze_min: min, altersgrenze_max: max });
    }
    const { data } = await supabase.from("gruppen").select("*");
    setGruppen(data || []);
  };

  const handleDelete = async () => {
    if (!selectedGruppe) return;
    const ok = await confirm({ message: "Gruppe wirklich löschen?" });
    if (!ok) return;
    await supabase.from("gruppen").delete().eq("id", selectedGruppe.id);
    const { data } = await supabase.from("gruppen").select("*");
    setGruppen(data || []);
    setSelectedGruppe(null);
    setFormData({ name: "", beschreibung: "", altersgrenze_min: "", altersgrenze_max: "" });
  };


  return (
    <RequireAuth>
      {!isAdmin ? (
        <div className="p-6 text-center">Kein Zugriff ❌</div>
      ) : (
        <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Gruppenverwaltung</h1>
         <div className="flex gap-2 flex-wrap">
          {gruppen.map((g) => (
            <Button
              key={g.id}
              variant={selectedGruppe?.id === g.id ? "default" : "outline"}
              onClick={() => {
                setSelectedGruppe(g);
                setFormOpen(false);
              }}
            >
              {g.name}
            </Button>
          ))}
<Button variant="outline" onClick={handleNew}>
            + Neue Gruppe
          </Button>
        </div>
        <div className="border rounded">
          <button
            className="flex w-full items-center justify-between p-4"
            onClick={() => setFormOpen((o) => !o)}
          >
            <h2 className="text-lg font-semibold">
              {selectedGruppe ? "Gruppe bearbeiten" : "Neue Gruppe"}
            </h2>
            {formOpen ? (
              <ChevronUpIcon className="size-4" />
            ) : (
              <ChevronDownIcon className="size-4" />
            )}
          </button>
          {formOpen && (
            <div className="p-4 border-t space-y-2">
              <Input
                placeholder="Name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
              <Textarea
                placeholder="Beschreibung"
                value={formData.beschreibung}
                onChange={(e) =>
                  setFormData({ ...formData, beschreibung: e.target.value })
                }
              />
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Mindestalter"
                  value={formData.altersgrenze_min}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      altersgrenze_min: e.target.value,
                    })
                  }
                />
                <Input
                  type="number"
                  placeholder="Höchstalter"
                  value={formData.altersgrenze_max}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      altersgrenze_max: e.target.value,
                    })
                  }
                />
              </div>
              <div className="flex justify-end gap-2">
                {selectedGruppe && (
                  <Button variant="destructive" onClick={handleDelete}>
                    Löschen
                  </Button>
                )}
                <Button onClick={handleSave}>
                  {selectedGruppe ? "Speichern" : "Anlegen"}
                </Button>
              </div>
            </div>
          )}

        </div>
        {selectedGruppe && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Mitglieder</h2>
            <table className="w-full text-sm border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2">Name</th>
                  <th className="p-2">Alter</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Aktion</th>
                  <th className="p-2">Kommentar</th>
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
                      <td className="p-2">
                        {m.vorname} {m.nachname}
                      </td>
                      <td className="p-2">{alter}</td>
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
                  );
                })}
              </tbody>
            </table>

    
          </div>
        )}
      </div>
      )}
    </RequireAuth>
  );
}