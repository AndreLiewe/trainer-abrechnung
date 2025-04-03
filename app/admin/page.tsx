// 🚀 Admin-Dashboard – Bereinigt & Typsicher (final)
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";

// Typen
interface Eintrag {
  id: string;
  datum: string;
  sparte: string;
  beginn: string;
  ende: string;
  hallenfeld: string;
  funktion: string;
  aufbau: boolean;
  trainername: string;
}

interface Standardzeit {
  wochentag: string;
  sparte: string;
  beginn: string;
  ende: string;
}

function getWochentag(date: string) {
  return format(parseISO(date), "EEEE", { locale: undefined });
}

function zeitÜberschneidung(aStart: string, aEnde: string, bStart: string, bEnde: string) {
  return !(aEnde <= bStart || bEnde <= aStart);
}

export default function AdminDashboard() {
  const [entries, setEntries] = useState<Eintrag[]>([]);
  const [standardzeiten, setStandardzeiten] = useState<Standardzeit[]>([]);
  const [selected, setSelected] = useState<Eintrag | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [onlyConflicts, setOnlyConflicts] = useState(false);
  const router = useRouter();

  const fetchData = async () => {
    const { data: eintraege } = await supabase.from("abrechnungen").select("*");
    const { data: sollzeiten } = await supabase.from("standardzeiten").select("*");
    setEntries(eintraege as Eintrag[] || []);
    setStandardzeiten(sollzeiten as Standardzeit[] || []);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const findeKonflikte = (entry: Eintrag, all: Eintrag[]) => {
    const konflikte: string[] = [];

    const doppelt = all.filter(
      (e) =>
        e.id !== entry.id &&
        e.trainername === entry.trainername &&
        e.datum === entry.datum &&
        e.beginn === entry.beginn &&
        e.ende === entry.ende &&
        e.sparte === entry.sparte &&
        e.hallenfeld === entry.hallenfeld
    );
    if (doppelt.length) konflikte.push("Doppelteingabe erkannt");

    const gleichesFeld = all.filter(
      (e) =>
        e.id !== entry.id &&
        e.datum === entry.datum &&
        e.hallenfeld === entry.hallenfeld &&
        zeitÜberschneidung(entry.beginn, entry.ende, e.beginn, e.ende)
    );
    gleichesFeld.forEach((e) => {
      if (e.sparte !== entry.sparte) {
        konflikte.push("Gleiches Feld: unterschiedliche Sparte");
      } else if (e.funktion === "trainer" && entry.funktion === "trainer") {
        konflikte.push("Gleichzeitige Trainer (nicht Hilfstrainer)");
      }
    });

    const soll = standardzeiten.find(
      (s) => s.wochentag === getWochentag(entry.datum) && s.sparte === entry.sparte
    );
    if (soll && (entry.beginn !== soll.beginn || entry.ende !== soll.ende)) {
      konflikte.push("Abweichung vom Standardzeitplan");
    }

    return konflikte;
  };

  const handleEdit = (entry: Eintrag) => {
    setSelected(entry);
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!selected) return;
    const { id, ...updateData } = selected;
    const { error } = await supabase.from("abrechnungen").update(updateData).eq("id", id);
    if (!error) {
      toast.success("Aktualisiert ✅");
      setEditOpen(false);
      fetchData();
    } else {
      toast.error("Fehler beim Speichern");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Wirklich löschen?")) return;
    await supabase.from("abrechnungen").delete().eq("id", id);
    fetchData();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Admin-Dashboard</h1>
        <Button variant="outline" onClick={() => router.push("/start")}>🔙 Zurück</Button>
      </div>

      <div className="mb-4">
        <label className="text-sm flex gap-2 items-center">
          <input type="checkbox" checked={onlyConflicts} onChange={(e) => setOnlyConflicts(e.target.checked)} />
          Nur Einträge mit Konflikten anzeigen
        </label>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-4">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th>Datum</th>
                <th>Sparte</th>
                <th>Beginn</th>
                <th>Ende</th>
                <th>Feld</th>
                <th>Funktion</th>
                <th>Aufbau</th>
                <th>Trainer</th>
                <th>⚠️</th>
                <th>Aktion</th>
              </tr>
            </thead>
            <tbody>
              {entries
                .map((e) => ({ ...e, konflikte: findeKonflikte(e, entries) }))
                .filter((e) => !onlyConflicts || e.konflikte.length > 0)
                .map((e) => (
                  <tr key={e.id} className={e.konflikte.length ? "bg-yellow-100" : ""}>
                    <td>{e.datum}</td>
                    <td>{e.sparte}</td>
                    <td>{e.beginn}</td>
                    <td>{e.ende}</td>
                    <td>{e.hallenfeld}</td>
                    <td>{e.funktion}</td>
                    <td>{e.aufbau ? "Ja" : "Nein"}</td>
                    <td>{e.trainername}</td>
                    <td title={e.konflikte.join("\n")}>
                      {e.konflikte.length > 0 ? "⚠️" : ""}
                    </td>
                    <td className="space-x-1">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(e)}>✏️</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(e.id)}>🗑️</Button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <h2 className="text-lg font-bold mb-4">Eintrag bearbeiten</h2>
          {selected && (
            <div className="grid grid-cols-2 gap-4">
              {(["datum", "sparte", "beginn", "ende", "funktion", "aufbau", "hallenfeld", "trainername"] as (keyof Eintrag)[]).map((field) => (
                <div key={field}>
                  <Label>{field}</Label>
                  <Input
                    value={selected?.[field] ?? ""}
                    onChange={(e) => setSelected({ ...selected, [field]: e.target.value })}
                  />
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Abbrechen</Button>
            <Button onClick={handleUpdate}>Speichern</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
