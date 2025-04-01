"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useRouter } from "next/navigation";

// Typ für Einträge
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
  status?: string;
};

export default function AdminPage() {
  const [entries, setEntries] = useState<Abrechnung[]>([]);
  const [filterMonat, setFilterMonat] = useState("");
  const [filterSparte, setFilterSparte] = useState("");
  const [filterTrainer, setFilterTrainer] = useState("");
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
  const [isAdmin, setIsAdmin] = useState(false);
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

  const fetchData = useCallback(async () => {
    let query = supabase.from("abrechnungen").select("*");
    if (filterMonat) {
      query = query.gte("datum", `${filterMonat}-01`).lte("datum", `${filterMonat}-31`);
    }
    if (filterSparte) {
      query = query.eq("sparte", filterSparte);
    }
    if (filterTrainer) {
      query = query.eq("trainername", filterTrainer);
    }
    const { data } = await query;
    setEntries(data || []);
  }, [filterMonat, filterSparte, filterTrainer]);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [fetchData, isAdmin]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    await supabase.from("abrechnungen").update({ status: newStatus }).eq("id", id);
    fetchData();
  };

  const handleDelete = async (id: string) => {
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
        status: "Eingereicht"
      },
    ]);
    setNewEntry({ datum: "", sparte: "", beginn: "", ende: "", hallenfeld: "1", funktion: "trainer", aufbau: "nein", trainername: "" });
    fetchData();
  };

  if (!isAdmin) {
    return <div className="p-6 text-center">Kein Zugriff ❌</div>;
  }

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
              <SelectItem value="">Alle</SelectItem>
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
          <Input placeholder="Trainername" value={filterTrainer} onChange={(e) => setFilterTrainer(e.target.value)} />
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
                <th>Status</th>
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
                  <td>
                    <Select value={e.status || "Eingereicht"} onValueChange={(val) => handleStatusChange(e.id, val)}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Status wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Eingereicht">Eingereicht</SelectItem>
                        <SelectItem value="In Prüfung">In Prüfung</SelectItem>
                        <SelectItem value="Überwiesen">Überwiesen</SelectItem>
                        <SelectItem value="Rückstellung">Rückstellung</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td>
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
          <Input placeholder="Sparte" value={newEntry.sparte} onChange={(e) => handleNewChange("sparte", e.target.value)} />
          <Input type="time" placeholder="Beginn" value={newEntry.beginn} onChange={(e) => handleNewChange("beginn", e.target.value)} />
          <Input type="time" placeholder="Ende" value={newEntry.ende} onChange={(e) => handleNewChange("ende", e.target.value)} />
          <Input placeholder="Feld" value={newEntry.hallenfeld} onChange={(e) => handleNewChange("hallenfeld", e.target.value)} />
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
          <Input placeholder="Trainername" value={newEntry.trainername} onChange={(e) => handleNewChange("trainername", e.target.value)} />
        </div>
        <Button onClick={handleNewSubmit}>Eintrag speichern</Button>
      </div>

      <div className="mt-8 text-center">
        <Button variant="outline" onClick={() => router.push("/start")}>🔙 Zur Startseite</Button>
      </div>
    </div>
  );
}
