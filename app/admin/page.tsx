// 🚀 Admin-Dashboard – Kombiniert mit Eingabemaske & Konfliktprüfung
"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";

interface Abrechnung {
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
  const [entries, setEntries] = useState<Abrechnung[]>([]);
  const [standardzeiten, setStandardzeiten] = useState<Standardzeit[]>([]);
  const [trainerList, setTrainerList] = useState<string[]>([]);
  const [filterMonat, setFilterMonat] = useState("");
  const [filterSparte, setFilterSparte] = useState("alle");
  const [filterTrainer, setFilterTrainer] = useState("alle");
  const [isAdmin, setIsAdmin] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<Abrechnung | null>(null);
  const [onlyConflicts, setOnlyConflicts] = useState(false);
  const [newEntry, setNewEntry] = useState({
    datum: "",
    sparte: "",
    beginn: "",
    ende: "",
    hallenfeld: "1",
    funktion: "trainer",
    aufbau: "nein",
    trainername: "",
  });
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const { data, error } = await supabase.from("admin_users").select("email").eq("email", user.email).single();
        if (data && !error) setIsAdmin(true);
      }
    };
    checkUser();
  }, []);

  const fetchData = useCallback(async () => {
    let query = supabase.from("abrechnungen").select("*");
    if (filterMonat) {
      const [jahr, monat] = filterMonat.split("-");
      const lastDay = new Date(Number(jahr), Number(monat), 0).getDate();
      query = query.gte("datum", `${filterMonat}-01`).lte("datum", `${filterMonat}-${lastDay}`);
    }
    if (filterSparte !== "alle") query = query.eq("sparte", filterSparte);
    if (filterTrainer !== "alle") query = query.eq("trainername", filterTrainer);
    const { data } = await query;
    setEntries(data || []);
  }, [filterMonat, filterSparte, filterTrainer]);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [fetchData, isAdmin]);

  useEffect(() => {
    const loadTrainer = async () => {
      const { data } = await supabase.from("trainer_profiles").select("name");
      if (data) {
        const namen = data.map((t) => t.name).filter((n) => !!n);
        setTrainerList(namen);
      }
    };
    const loadStandards = async () => {
      const { data } = await supabase.from("standardzeiten").select("*");
      setStandardzeiten(data || []);
    };
    loadTrainer();
    loadStandards();
  }, []);

  const findeKonflikte = (entry: Abrechnung, all: Abrechnung[]) => {
    const konflikte: string[] = [];
    const doppelt = all.filter(e => e.id !== entry.id && e.trainername === entry.trainername && e.datum === entry.datum && e.beginn === entry.beginn && e.ende === entry.ende && e.sparte === entry.sparte && e.hallenfeld === entry.hallenfeld);
    if (doppelt.length) konflikte.push("Doppelteingabe erkannt");
    const gleichesFeld = all.filter(e => e.id !== entry.id && e.datum === entry.datum && e.hallenfeld === entry.hallenfeld && zeitÜberschneidung(entry.beginn, entry.ende, e.beginn, e.ende));
    gleichesFeld.forEach(e => {
      if (e.sparte !== entry.sparte) konflikte.push("Gleiches Feld: unterschiedliche Sparte");
      else if (e.funktion === "trainer" && entry.funktion === "trainer") konflikte.push("Gleichzeitige Trainer (nicht Hilfstrainer)");
    });
    const soll = standardzeiten.find(s => s.wochentag === getWochentag(entry.datum) && s.sparte === entry.sparte);
    if (soll && (entry.beginn !== soll.beginn || entry.ende !== soll.ende)) konflikte.push("Abweichung vom Standardzeitplan");
    return konflikte;
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Wirklich löschen?")) return;
    await supabase.from("abrechnungen").delete().eq("id", id);
    fetchData();
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
    await supabase.from("abrechnungen").insert([{ datum, sparte, beginn, ende, hallenfeld, funktion, aufbau: aufbau === "ja", trainername }]);
    setNewEntry({ datum: "", sparte: "", beginn: "", ende: "", hallenfeld: "1", funktion: "trainer", aufbau: "nein", trainername: "" });
    toast.success("Eintrag gespeichert ✅");
    fetchData();
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
                <th>Vergütung (€)</th>
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
                    <td>{berechneVerguetung(e.beginn, e.ende, e.aufbau, e.funktion)}</td>
                    <td title={e.konflikte.join("\n")}>
                      {e.konflikte.length > 0 ? "⚠️" : ""}
                    </td>
                    <td className="space-x-1">
                      <Button size="sm" variant="outline" onClick={() => setSelected(e)}>✏️</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(e.id)}>🗑️</Button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="mt-6">
        <h2 className="text-lg font-bold mb-2">Neuen Eintrag hinzufügen</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <Input type="date" placeholder="Datum" value={newEntry.datum} onChange={(e) => handleNewChange("datum", e.target.value)} />
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
          <Input type="time" placeholder="Beginn" value={newEntry.beginn} onChange={(e) => handleNewChange("beginn", e.target.value)} />
          <Input type="time" placeholder="Ende" value={newEntry.ende} onChange={(e) => handleNewChange("ende", e.target.value)} />
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
    </div>
  );
}
