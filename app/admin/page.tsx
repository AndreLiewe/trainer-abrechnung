// 🚀 Admin-Dashboard – Bereinigt, vollständig & mit Bearbeitung + Abrechnungs-Sperre
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";

// Typen
type Abrechnung = {
  id: string;
  datum: string;
  sparte: string;
  beginn: string;
  ende: string;
  hallenfeld: string;
  funktion: string;
  aufbau: boolean;
  trainername: string;
};

type Standardzeit = {
  wochentag: string;
  sparte: string;
  beginn: string;
  ende: string;
};

type Abrechnungslauf = {
  id: string;
  monat: string; // z. B. "2024-04"
  trainername: string;
};

function getWochentag(date: string) {
  return format(parseISO(date), "EEEE", { locale: undefined });
}

function zeitÜberschneidung(aStart: string, aEnde: string, bStart: string, bEnde: string) {
  return !(aEnde <= bStart || bEnde <= aStart);
}

function getMonatYYYYMM(date: string) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function AdminDashboard() {
  const [entries, setEntries] = useState<Abrechnung[]>([]);
  const [standardzeiten, setStandardzeiten] = useState<Standardzeit[]>([]);
  const [abrechnungen, setAbrechnungen] = useState<Abrechnungslauf[]>([]);
  const [trainerList, setTrainerList] = useState<string[]>([]);
  const [filterMonat, setFilterMonat] = useState("");
  const [filterSparte, setFilterSparte] = useState("alle");
  const [filterTrainer, setFilterTrainer] = useState("alle");
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<Abrechnung | null>(null);
  const [newEntry, setNewEntry] = useState({ datum: "", sparte: "", beginn: "", ende: "", hallenfeld: "1", funktion: "trainer", aufbau: "nein", trainername: "" });
  const router = useRouter();

  const fetchData = async () => {
    const { data: eintraege } = await supabase.from("abrechnungen").select("*");
    const { data: sollzeiten } = await supabase.from("standardzeiten").select("*");
    const { data: abrechnungData } = await supabase.from("abrechnungslauf").select("*");
    const { data: trainer } = await supabase.from("trainer_profiles").select("name");
    setEntries(eintraege || []);
    setStandardzeiten(sollzeiten || []);
    setAbrechnungen(abrechnungData || []);
    setTrainerList(trainer?.map((t) => t.name) || []);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const findeKonflikte = (entry: Abrechnung, all: Abrechnung[]) => {
    const konflikte: string[] = [];
    const doppelt = all.filter((e) => e.id !== entry.id && e.trainername === entry.trainername && e.datum === entry.datum && e.beginn === entry.beginn && e.ende === entry.ende && e.sparte === entry.sparte && e.hallenfeld === entry.hallenfeld);
    if (doppelt.length) konflikte.push("Doppelteingabe erkannt");

    const gleichesFeld = all.filter((e) => e.id !== entry.id && e.datum === entry.datum && e.hallenfeld === entry.hallenfeld && zeitÜberschneidung(entry.beginn, entry.ende, e.beginn, e.ende));
    gleichesFeld.forEach((e) => {
      if (e.sparte !== entry.sparte) {
        konflikte.push("Gleiches Feld: unterschiedliche Sparte");
      } else if (e.funktion === "trainer" && entry.funktion === "trainer") {
        konflikte.push("Gleichzeitige Trainer (nicht Hilfstrainer)");
      }
    });

    const soll = standardzeiten.find((s) => s.wochentag === getWochentag(entry.datum) && s.sparte === entry.sparte);
    if (soll && (entry.beginn !== soll.beginn || entry.ende !== soll.ende)) {
      konflikte.push("Abweichung vom Standardzeitplan");
    }
    return konflikte;
  };

  const eintragGesperrt = (entry: Abrechnung) => {
    const monat = getMonatYYYYMM(entry.datum);
    return abrechnungen.some((a) => a.trainername === entry.trainername && a.monat === monat);
  };

  const handleDelete = async (id: string) => {
    const eintrag = entries.find((e) => e.id === id);
    if (!eintrag || eintragGesperrt(eintrag)) {
      toast.error("Eintrag ist gesperrt (bereits abgerechnet)");
      return;
    }
    if (!confirm("Wirklich löschen?")) return;
    await supabase.from("abrechnungen").delete().eq("id", id);
    fetchData();
  };

  const handleEdit = (entry: Abrechnung) => {
    if (eintragGesperrt(entry)) {
      toast.error("Bearbeitung nicht möglich: Abrechnung existiert");
      return;
    }
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

  const handleNewChange = (key: string, value: string) => {
    setNewEntry({ ...newEntry, [key]: value });
  };

  const handleNewSubmit = async () => {
    const { datum, sparte, beginn, ende, hallenfeld, funktion, aufbau, trainername } = newEntry;
    if (!datum || !sparte || !beginn || !ende || !hallenfeld || !funktion || !trainername) {
      toast.error("Bitte alle Felder ausfüllen");
      return;
    }
    await supabase.from("abrechnungen").insert([
      {
        datum,
        sparte,
        beginn,
        ende,
        hallenfeld,
        funktion,
        aufbau: aufbau === "ja",
        trainername,
      },
    ]);
    setNewEntry({ datum: "", sparte: "", beginn: "", ende: "", hallenfeld: "1", funktion: "trainer", aufbau: "nein", trainername: "" });
    fetchData();
  };

  const berechneVerguetung = (beginn: string, ende: string, aufbau: boolean, funktion: string) => {
    const [hBeginn, mBeginn] = beginn.split(":").map(Number);
    const [hEnde, mEnde] = ende.split(":").map(Number);
    const beginnMin = hBeginn * 60 + mBeginn;
    let endeMin = hEnde * 60 + mEnde;
    if (endeMin < beginnMin) endeMin += 24 * 60;
    let dauer = (endeMin - beginnMin) / 60;
    if (aufbau) dauer += 0.5;
    const stundenlohn = funktion === "hilfstrainer" ? 10 : 20;
    return (dauer * stundenlohn).toFixed(2);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Admin-Dashboard</h1>
        <Button variant="outline" onClick={() => router.push("/start")}>🔙 Zurück</Button>
      </div>

      <div className="flex gap-4 mb-6 flex-wrap">
        <div>
          <Label>Monat</Label>
          <Input type="month" value={filterMonat} onChange={(e) => setFilterMonat(e.target.value)} />
        </div>
        <div>
          <Label>Sparte</Label>
          <Select value={filterSparte} onValueChange={setFilterSparte}>
            <SelectTrigger><SelectValue placeholder="Alle Sparten" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle</SelectItem>
              <SelectItem value="Judo">Judo</SelectItem>
              <SelectItem value="Kinderturnen">Kinderturnen</SelectItem>
              <SelectItem value="Zirkeltraining">Zirkeltraining</SelectItem>
              <SelectItem value="Eltern-Kind-Turnen">Eltern-Kind-Turnen</SelectItem>
              <SelectItem value="Leistungsturnen">Leistungsturnen</SelectItem>
              <SelectItem value="Turntraining im Parcours">Turntraining im Parcours</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Trainer</Label>
          <Select value={filterTrainer} onValueChange={setFilterTrainer}>
            <SelectTrigger><SelectValue placeholder="Alle Trainer" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle</SelectItem>
              {trainerList.map((name) => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
                <th>Vergütung (€)</th>
                <th>⚠️</th>
                <th>Aktion</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const konflikte = findeKonflikte(e, entries);
                return (
                  <tr key={e.id} className={konflikte.length ? "bg-yellow-100" : ""}>
                    <td>{e.datum}</td>
                    <td>{e.sparte}</td>
                    <td>{e.beginn}</td>
                    <td>{e.ende}</td>
                    <td>{e.hallenfeld}</td>
                    <td>{e.funktion}</td>
                    <td>{e.aufbau ? "Ja" : "Nein"}</td>
                    <td>{e.trainername}</td>
                    <td>{berechneVerguetung(e.beginn, e.ende, e.aufbau, e.funktion)}</td>
                    <td title={konflikte.join("\n")}>{konflikte.length > 0 ? "⚠️" : ""}</td>
                    <td className="space-x-1">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(e)}>✏️</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(e.id)}>🗑️</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="mt-6">
        <h2 className="text-lg font-bold mb-2">Neuen Eintrag hinzufügen</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <Input type="date" value={newEntry.datum} onChange={(e) => handleNewChange("datum", e.target.value)} />
          <Select value={newEntry.sparte} onValueChange={(val) => handleNewChange("sparte", val)}>
            <SelectTrigger><SelectValue placeholder="Sparte" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Judo">Judo</SelectItem>
              <SelectItem value="Kinderturnen">Kinderturnen</SelectItem>
              <SelectItem value="Zirkeltraining">Zirkeltraining</SelectItem>
              <SelectItem value="Eltern-Kind-Turnen">Eltern-Kind-Turnen</SelectItem>
              <SelectItem value="Leistungsturnen">Leistungsturnen</SelectItem>
              <SelectItem value="Turntraining im Parcours">Turntraining im Parcours</SelectItem>
            </SelectContent>
          </Select>
          <Input type="time" value={newEntry.beginn} onChange={(e) => handleNewChange("beginn", e.target.value)} />
          <Input type="time" value={newEntry.ende} onChange={(e) => handleNewChange("ende", e.target.value)} />
          <Select value={newEntry.hallenfeld} onValueChange={(val) => handleNewChange("hallenfeld", val)}>
            <SelectTrigger><SelectValue placeholder="Feld" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Feld 1</SelectItem>
              <SelectItem value="2">Feld 2</SelectItem>
              <SelectItem value="3">Feld 3</SelectItem>
            </SelectContent>
          </Select>
          <Select value={newEntry.funktion} onValueChange={(val) => handleNewChange("funktion", val)}>
            <SelectTrigger><SelectValue placeholder="Funktion" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="trainer">Trainer</SelectItem>
              <SelectItem value="hilfstrainer">Hilfstrainer</SelectItem>
            </SelectContent>
          </Select>
          <Select value={newEntry.aufbau} onValueChange={(val) => handleNewChange("aufbau", val)}>
            <SelectTrigger><SelectValue placeholder="Aufbau" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ja">Ja</SelectItem>
              <SelectItem value="nein">Nein</SelectItem>
            </SelectContent>
          </Select>
          <Select value={newEntry.trainername} onValueChange={(val) => handleNewChange("trainername", val)}>
            <SelectTrigger><SelectValue placeholder="Trainer" /></SelectTrigger>
            <SelectContent>
              {trainerList.map((name) => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleNewSubmit}>Eintrag speichern</Button>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <h2 className="text-lg font-bold mb-4">Eintrag bearbeiten</h2>
          {selected && (
            <div className="grid grid-cols-2 gap-4">
              {(["datum", "sparte", "beginn", "ende", "funktion", "aufbau", "hallenfeld", "trainername"] as (keyof Abrechnung)[]).map((field) => (
                <div key={field}>
                  <Label>{field}</Label>
