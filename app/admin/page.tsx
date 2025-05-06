"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useRouter } from "next/navigation";

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

export default function AdminPage() {
  const [entries, setEntries] = useState<Abrechnung[]>([]);
  const [trainerList, setTrainerList] = useState<string[]>([]);
  const [filterMonat, setFilterMonat] = useState("");
  const [filterSparte, setFilterSparte] = useState("alle");
  const [filterTrainer, setFilterTrainer] = useState("alle");
  const [isAdmin, setIsAdmin] = useState(false);
  const [editEntry, setEditEntry] = useState<Abrechnung | null>(null);
  const [newEntry, setNewEntry] = useState({
    datum: "",
    sparte: "",
    beginn: "",
    ende: "",
    hallenfeld: "1",
    funktion: "trainer",
    aufbau: "nein",
    trainername: ""
  });
  const router = useRouter();

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
    const loadTrainer = async () => {
      const { data } = await supabase.from("trainer_profiles").select("name");
      if (data) {
        const namen = data.map((t) => t.name).filter((n) => !!n);
        setTrainerList(namen);
      }
    };
    loadTrainer();
  }, []);

  const fetchData = useCallback(async () => {
    let query = supabase.from("abrechnungen").select("*");
    if (filterMonat) {
      const [jahr, monat] = filterMonat.split("-");
      const lastDay = new Date(Number(jahr), Number(monat), 0).getDate();
      query = query
        .gte("datum", `${filterMonat}-01`)
        .lte("datum", `${filterMonat}-${lastDay}`);
    }
    if (filterSparte !== "alle") {
      query = query.eq("sparte", filterSparte);
    }
    if (filterTrainer && filterTrainer !== "alle") {
      query = query.eq("trainername", filterTrainer);
    }
    const { data } = await query;
    setEntries(data || []);
  }, [filterMonat, filterSparte, filterTrainer]);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [fetchData, isAdmin]);

  const handleDelete = async (id: string) => {
    const confirmed = confirm("Wirklich löschen?");
    if (!confirmed) return;
    await supabase.from("abrechnungen").delete().eq("id", id);
    fetchData();
  };

  const handleNewChange = (key: string, value: string) => {
    setNewEntry({ ...newEntry, [key]: value });
  };

  const handleNewSubmit = async () => {
    const { datum, sparte, beginn, ende, hallenfeld, funktion, aufbau, trainername } = newEntry;
    if (!datum || !sparte || !beginn || !ende || !hallenfeld || !funktion || !trainername) {
      alert("Bitte alle Felder ausfüllen");
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
    const betrag = dauer * stundenlohn;
    return betrag.toFixed(2);
  };

  if (!isAdmin) {
    return <div className="p-6 text-center">Kein Zugriff ❌</div>;
  }
{editEntry && (
  <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
    <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-2xl space-y-4">
      <h2 className="text-lg font-bold">Eintrag bearbeiten</h2>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Input type="date" value={editEntry.datum} onChange={(e) => setEditEntry({ ...editEntry, datum: e.target.value })} />
        <Input value={editEntry.sparte} onChange={(e) => setEditEntry({ ...editEntry, sparte: e.target.value })} />
        <Input type="time" value={editEntry.beginn} onChange={(e) => setEditEntry({ ...editEntry, beginn: e.target.value })} />
        <Input type="time" value={editEntry.ende} onChange={(e) => setEditEntry({ ...editEntry, ende: e.target.value })} />
        <Input value={editEntry.hallenfeld} onChange={(e) => setEditEntry({ ...editEntry, hallenfeld: e.target.value })} />
        <Select value={editEntry.funktion} onValueChange={(val) => setEditEntry({ ...editEntry, funktion: val })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="trainer">Trainer</SelectItem>
            <SelectItem value="hilfstrainer">Hilfstrainer</SelectItem>
          </SelectContent>
        </Select>
        <Select value={editEntry.aufbau ? "ja" : "nein"} onValueChange={(val) => setEditEntry({ ...editEntry, aufbau: val === "ja" })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ja">Ja</SelectItem>
            <SelectItem value="nein">Nein</SelectItem>
          </SelectContent>
        </Select>
        <Input value={editEntry.trainername} onChange={(e) => setEditEntry({ ...editEntry, trainername: e.target.value })} />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => setEditEntry(null)}>Abbrechen</Button>
        <Button onClick={async () => {
          const { error } = await supabase.from("abrechnungen").update(editEntry).eq("id", editEntry.id);
          if (!error) {
            setEditEntry(null);
            fetchData();
          } else {
            alert("Fehler beim Speichern");
            console.error(error);
          }
        }}>Speichern</Button>
      </div>
    </div>
  </div>
)}

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Admin-Dashboard</h1>

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
            <thead>
              <tr className="text-left border-b">
                <th>Datum</th>
                <th>Sparte</th>
                <th>Beginn</th>
                <th>Ende</th>
                <th>Feld</th>
                <th>Funktion</th>
                <th>Aufbau</th>
                <th>Trainer</th>
                <th>Vergütung (€)</th>
                <th>Aktion</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b hover:bg-gray-50">
                  <td>{e.datum}</td>
                  <td>{e.sparte}</td>
                  <td>{e.beginn}</td>
                  <td>{e.ende}</td>
                  <td>{e.hallenfeld}</td>
                  <td>{e.funktion}</td>
                  <td>{e.aufbau ? "Ja" : "Nein"}</td>
                  <td>{e.trainername}</td>
                  <td>{berechneVerguetung(e.beginn, e.ende, e.aufbau, e.funktion)}</td>
                  <td className="space-x-2">
                  <Button size="sm" variant="outline" onClick={() => setEditEntry(e)}>Bearbeiten</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(e.id)}>Löschen</Button>
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

      <div className="mt-8 text-center">
        <Button variant="outline" onClick={() => router.push("/start")}>🔙 Zur Startseite</Button>
      </div>
    </div>
  );
}


