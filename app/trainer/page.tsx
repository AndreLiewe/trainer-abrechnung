"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import RequireAuth from "@/components/RequireAuth";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { Dialog, DialogContent } from "@/components/ui/dialog";

// Typdefinition

type Abrechnungseintrag = {
  id: string;
  datum: string;
  sparte: string;
  beginn: string;
  ende: string;
  hallenfeld: string;
  aufbau: boolean;
  funktion: "trainer" | "hilfstrainer";
  trainername: string;
};

function editAllowed(datum: string) {
  const eintragsDatum = new Date(datum);
  const jetzt = new Date();
  const startAktuell = new Date(jetzt.getFullYear(), jetzt.getMonth(), 1);
  const startLetzter = new Date(jetzt.getFullYear(), jetzt.getMonth() - 1, 1);
  const endeLetzter = new Date(jetzt.getFullYear(), jetzt.getMonth(), 3, 23, 59, 59);
  return (
    (eintragsDatum >= startLetzter && eintragsDatum < startAktuell && jetzt <= endeLetzter) ||
    eintragsDatum >= startAktuell
  );
}

function getWochentag(datum: string) {
  try {
    const date = parseISO(datum);
    return format(date, "EEEE", { locale: de });
  } catch {
    return "-";
  }
}

export default function TrainerAbrechnung() {
  const [formData, setFormData] = useState({ datum: "", sparte: "", beginn: "", ende: "", hallenfeld: "1", aufbau: "nein", funktion: "trainer" });
  const [trainerName, setTrainerName] = useState("");
  const [entries, setEntries] = useState<Abrechnungseintrag[]>([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<Abrechnungseintrag | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: profile } = await supabase
        .from("trainer_profiles")
        .select("name")
        .eq("email", user.email)
        .single();

      if (!profile) return;

      setTrainerName(profile.name);
      loadEntries(profile.name);
    };

    fetchData();
  }, []);

  const loadEntries = async (trainername: string) => {
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const { data: updatedEntries, error: reloadError } = await supabase
      .from("abrechnungen")
      .select("*")
      .eq("trainername", trainername)
      .gte("datum", lastMonth.toISOString().split("T")[0])
      .order("datum", { ascending: false });
    if (!reloadError) setEntries(updatedEntries || []);
  };

  const handleEdit = (entry: Abrechnungseintrag) => {
    setSelectedEntry(entry);
    setEditModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedEntry) return;
    const { error } = await supabase.from("abrechnungen").update({
      datum: selectedEntry.datum,
      sparte: selectedEntry.sparte,
      beginn: selectedEntry.beginn,
      ende: selectedEntry.ende,
      hallenfeld: selectedEntry.hallenfeld,
      aufbau: selectedEntry.aufbau,
      funktion: selectedEntry.funktion,
    }).eq("id", selectedEntry.id);
    if (error) {
      toast.error("Fehler beim Aktualisieren");
    } else {
      toast.success("Eintrag aktualisiert ✅");
      setEditModalOpen(false);
      loadEntries(selectedEntry.trainername);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("Diesen Eintrag wirklich löschen?");
    if (!confirmed) return;
    const { error } = await supabase.from("abrechnungen").delete().eq("id", id);
    if (error) {
      toast.error("Löschen fehlgeschlagen.");
    } else {
      toast.success("Eintrag gelöscht.");
      setEntries((prev) => prev.filter((e) => e.id !== id));
    }
  };

  const handleSubmit = async () => {
    const { datum, sparte, beginn, ende, hallenfeld, aufbau, funktion } = formData;
    if (!trainerName) return;
    const { error } = await supabase.from("abrechnungen").insert([
      {
        datum,
        sparte,
        beginn,
        ende,
        hallenfeld,
        aufbau: aufbau === "ja",
        funktion,
        trainername: trainerName,
      },
    ]);

    if (error) {
      toast.error("Fehler beim Speichern");
    } else {
      toast.success("Eintrag gespeichert ✅");
      setFormData({ datum: "", sparte: "", beginn: "", ende: "", hallenfeld: "1", aufbau: "nein", funktion: "trainer" });
      loadEntries(trainerName);
    }
  };

  return (
    <RequireAuth>
      <div className="p-6 grid gap-6 max-w-3xl mx-auto">
        <div className="text-sm text-gray-500">⚠️ Einträge können nur bis zum 3. des Folgemonats bearbeitet oder gelöscht werden.</div>

        <table className="w-full text-sm border mt-4">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2">Wochentag</th>
              <th className="p-2">Datum</th>
              <th className="p-2">Sparte</th>
              <th className="p-2">Beginn</th>
              <th className="p-2">Ende</th>
              <th className="p-2">Funktion</th>
              <th className="p-2">Aufbau</th>
              <th className="p-2">Feld</th>
              <th className="p-2">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((eintrag) => (
              <tr key={eintrag.id} className="border-t">
                <td className="p-2">{getWochentag(eintrag.datum)}</td>
                <td className="p-2">{eintrag.datum}</td>
                <td className="p-2">{eintrag.sparte}</td>
                <td className="p-2">{eintrag.beginn}</td>
                <td className="p-2">{eintrag.ende}</td>
                <td className="p-2">{eintrag.funktion}</td>
                <td className="p-2">{eintrag.aufbau ? "Ja" : "Nein"}</td>
                <td className="p-2">{eintrag.hallenfeld}</td>
                <td className="p-2 space-x-1">
                  {editAllowed(eintrag.datum) ? (
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleEdit(eintrag)}>✏️</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(eintrag.id)}>🗑️</Button>
                    </>
                  ) : (
                    <span className="text-xs text-gray-400 italic">gesperrt</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent className="max-w-lg">
            <h2 className="text-lg font-semibold mb-4">Eintrag bearbeiten</h2>
            {selectedEntry && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Datum</Label>
                  <Input type="date" value={selectedEntry.datum} onChange={(e) => setSelectedEntry({ ...selectedEntry, datum: e.target.value })} />
                </div>
                <div>
                  <Label>Sparte</Label>
                  <Input value={selectedEntry.sparte} onChange={(e) => setSelectedEntry({ ...selectedEntry, sparte: e.target.value })} />
                </div>
                <div>
                  <Label>Beginn</Label>
                  <Input type="time" value={selectedEntry.beginn} onChange={(e) => setSelectedEntry({ ...selectedEntry, beginn: e.target.value })} />
                </div>
                <div>
                  <Label>Ende</Label>
                  <Input type="time" value={selectedEntry.ende} onChange={(e) => setSelectedEntry({ ...selectedEntry, ende: e.target.value })} />
                </div>
                <div>
                  <Label>Funktion</Label>
                  <Select value={selectedEntry.funktion} onValueChange={(val) => setSelectedEntry({ ...selectedEntry, funktion: val as "trainer" | "hilfstrainer" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trainer">Trainer</SelectItem>
                      <SelectItem value="hilfstrainer">Hilfstrainer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Aufbau</Label>
                  <Select value={selectedEntry.aufbau ? "ja" : "nein"} onValueChange={(val) => setSelectedEntry({ ...selectedEntry, aufbau: val === "ja" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ja">Ja</SelectItem>
                      <SelectItem value="nein">Nein</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Hallenfeld</Label>
                  <Input value={selectedEntry.hallenfeld} onChange={(e) => setSelectedEntry({ ...selectedEntry, hallenfeld: e.target.value })} />
                </div>
              </div>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditModalOpen(false)}>Abbrechen</Button>
              <Button onClick={handleUpdate}>Speichern</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </RequireAuth>
  );
}
