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

        <Card>
          <CardContent className="space-y-4 p-4">
            <h2 className="text-lg font-semibold">Neue Abrechnung einreichen</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Datum</Label>
                <Input type="date" value={formData.datum} onChange={(e) => setFormData({ ...formData, datum: e.target.value })} />
              </div>
              <div>
                <Label>Sparte</Label>
                <Input value={formData.sparte} onChange={(e) => setFormData({ ...formData, sparte: e.target.value })} />
              </div>
              <div>
                <Label>Beginn</Label>
                <Input type="time" value={formData.beginn} onChange={(e) => setFormData({ ...formData, beginn: e.target.value })} />
              </div>
              <div>
                <Label>Ende</Label>
                <Input type="time" value={formData.ende} onChange={(e) => setFormData({ ...formData, ende: e.target.value })} />
              </div>
              <div>
                <Label>Funktion</Label>
                <Select value={formData.funktion} onValueChange={(val) => setFormData({ ...formData, funktion: val as "trainer" | "hilfstrainer" })}>
                  <SelectTrigger><SelectValue placeholder="Funktion wählen" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trainer">Trainer</SelectItem>
                    <SelectItem value="hilfstrainer">Hilfstrainer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Aufbau</Label>
                <Select value={formData.aufbau} onValueChange={(val) => setFormData({ ...formData, aufbau: val })}>
                  <SelectTrigger><SelectValue placeholder="Aufbau?" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ja">Ja</SelectItem>
                    <SelectItem value="nein">Nein</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Hallenfeld</Label>
                <Input value={formData.hallenfeld} onChange={(e) => setFormData({ ...formData, hallenfeld: e.target.value })} />
              </div>
            </div>
            <Button className="mt-4 w-full" onClick={handleSubmit}>Einreichen</Button>
          </CardContent>
        </Card>

        {/* Tabelle und Modal folgen (bereits im Canvas enthalten) */}
      </div>
    </RequireAuth>
  );
}
