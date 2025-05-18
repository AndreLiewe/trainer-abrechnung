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
  SelectItem
} from "@/components/ui/select";
import { toast } from "sonner";

interface Korrektur {
  id: string;
  datum: string;
  beginn: string;
  ende: string;
  sparte: string;
  hallenfeld: string;
  aufbau: boolean;
  funktion: string;
  trainername: string;
  typ: "nachtrag" | "storno" | "korrektur";
  kommentar: string;
  zugeordnet_monat: number;
  zugeordnet_jahr: number;
}

export default function AdminKorrekturenPage() {
  const [eintraege, setEintraege] = useState<Korrektur[]>([]);
  const [trainerList, setTrainerList] = useState<string[]>([]);
  const [form, setForm] = useState({
    trainername: "",
    datum: "",
    beginn: "",
    ende: "",
    sparte: "",
    hallenfeld: "1",
    aufbau: "nein",
    funktion: "trainer",
    typ: "nachtrag",
    kommentar: "",
    zugeordnet_monat: new Date().getMonth() + 1,
    zugeordnet_jahr: new Date().getFullYear()
  });

  useEffect(() => {
    const fetchTrainer = async () => {
      const { data } = await supabase.from("trainer_profiles").select("name");
      if (data) {
        const namen = data.map((t) => t.name).filter(Boolean);
        setTrainerList(namen);
      }
    };
    fetchTrainer();
  }, []);

  useEffect(() => {
    const fetchKorrekturen = async () => {
      const { data } = await supabase.from("korrekturen").select("*").order("datum", { ascending: false });
      setEintraege(data || []);
    };
    fetchKorrekturen();
  }, []);

  const handleChange = (key: string, value: string) => {
    setForm({ ...form, [key]: value });
  };

  const handleSubmit = async () => {
    if (!form.trainername || !form.datum || !form.beginn || !form.ende || !form.sparte) {
      toast.error("Bitte alle Pflichtfelder ausfüllen");
      return;
    }

    const insertData = {
      ...form,
      aufbau: form.aufbau === "ja",
      zugeordnet_monat: Number(form.zugeordnet_monat),
      zugeordnet_jahr: Number(form.zugeordnet_jahr),
    };

    const { error } = await supabase.from("korrekturen").insert([insertData]);

    if (error) {
      toast.error("Fehler beim Speichern");
    } else {
      toast.success("Korrektur gespeichert ✅");
      setForm({ ...form, datum: "", beginn: "", ende: "", kommentar: "" });
      const { data } = await supabase.from("korrekturen").select("*").order("datum", { ascending: false });
      setEintraege(data || []);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Korrekturbuchungen</h1>

      <Card className="mb-6">
        <CardContent className="p-4 grid grid-cols-2 gap-4">
          <div>
            <Label>Trainer</Label>
            <Select value={form.trainername} onValueChange={(v) => handleChange("trainername", v)}>
              <SelectTrigger><SelectValue placeholder="Trainer wählen" /></SelectTrigger>
              <SelectContent>
                {trainerList.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Typ</Label>
            <Select value={form.typ} onValueChange={(v) => handleChange("typ", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nachtrag">Nachtrag</SelectItem>
                <SelectItem value="storno">Stornierung</SelectItem>
                <SelectItem value="korrektur">Korrektur</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Input type="date" value={form.datum} onChange={(e) => handleChange("datum", e.target.value)} />
          <Input type="time" value={form.beginn} onChange={(e) => handleChange("beginn", e.target.value)} />
          <Input type="time" value={form.ende} onChange={(e) => handleChange("ende", e.target.value)} />
          <Input placeholder="Sparte" value={form.sparte} onChange={(e) => handleChange("sparte", e.target.value)} />
          <Input placeholder="Feld" value={form.hallenfeld} onChange={(e) => handleChange("hallenfeld", e.target.value)} />
          <Input placeholder="Funktion" value={form.funktion} onChange={(e) => handleChange("funktion", e.target.value)} />
          <Input placeholder="Kommentar" value={form.kommentar} onChange={(e) => handleChange("kommentar", e.target.value)} />
          <Button onClick={handleSubmit}>Speichern</Button>
        </CardContent>
      </Card>

      <table className="w-full text-sm border">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2">Trainer</th>
            <th className="p-2">Typ</th>
            <th className="p-2">Datum</th>
            <th className="p-2">Beginn</th>
            <th className="p-2">Ende</th>
            <th className="p-2">Sparte</th>
            <th className="p-2">Kommentar</th>
          </tr>
        </thead>
        <tbody>
          {eintraege.map((e) => (
            <tr key={e.id} className="border-t">
              <td className="p-2">{e.trainername}</td>
              <td className="p-2">{e.typ}</td>
              <td className="p-2">{e.datum}</td>
              <td className="p-2">{e.beginn}</td>
              <td className="p-2">{e.ende}</td>
              <td className="p-2">{e.sparte}</td>
              <td className="p-2">{e.kommentar}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-8 text-center">
  <Button variant="ghost" onClick={() => window.location.href = "/admin"}>
    🔙 Zurück zum Admin-Dashboard
  </Button>
</div>

    </div>
  );
}
