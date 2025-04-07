// 🚀 Admin-Dashboard – Vollständiger Code
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
  const [newEntry, setNewEntry] = useState({ datum: "", sparte: "", beginn: "", ende: "", hallenfeld: "1", funktion: "trainer", aufbau: false, trainername: "" });
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<Abrechnung | null>(null);
  const router = useRouter();

  const fetchData = async () => {
    const { data: eintraege } = await supabase.from("abrechnungen").select("*");
    const { data: sollzeiten } = await supabase.from("standardzeiten").select("*");
    const { data: trainer } = await supabase.from("trainer_profiles").select("name");
    setEntries(eintraege || []);
    setStandardzeiten(sollzeiten || []);
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

  const eintragAbgerechnet = async (eintragId: string) => {
    const { data } = await supabase.from("abrechnungen_export").select("eintrag_id").eq("eintrag_id", eintragId);
    return data && data.length > 0;
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Wirklich löschen?")) return;
    if (await eintragAbgerechnet(id)) {
      toast.error("Eintrag kann nicht gelöscht werden: bereits abgerechnet.");
      return;
    }
    await supabase.from("abrechnungen").delete().eq("id", id);
    fetchData();
  };

  const handleEdit = (entry: Abrechnung) => {
    setSelected(entry);
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!selected) return;
    if (await eintragAbgerechnet(selected.id)) {
      toast.error("Eintrag kann nicht bearbeitet werden: bereits abgerechnet.");
      return;
    }
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

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Admin-Dashboard</h1>
        <Button variant="outline" onClick={() => router.push("/start")}>🔙 Zurück</Button>
      </div>
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
    toast.success("Neuer Eintrag hinzugefügt ✅");
    setNewEntry({
      datum: "",
      sparte: "",
      beginn: "",
      ende: "",
      hallenfeld: "1",
      funktion: "trainer",
      aufbau: "nein",
      trainername: "",
    });
    fetchData();
  };

  const berechneVerguetung = (
    beginn: string,
    ende: string,
    aufbau: boolean,
    funktion: string
  ) => {
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

  const gefilterteEinträge = entries.filter((eintrag) => {
    if (filterMonat && !eintrag.datum.startsWith(filterMonat)) return false;
    if (filterSparte !== "alle" && eintrag.sparte !== filterSparte) return false;
    if (filterTrainer !== "alle" && eintrag.trainername !== filterTrainer) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Admin-Dashboard</h1>
        <Button variant="outline" onClick={() => router.push("/start")}>
          🔙 Zurück
        </Button>
      </div>

      <div className="flex gap-4 mb-6 flex-wrap">
        <div>
          <Label>Monat</Label>
          <Input
            type="month"
            value={filterMonat}
            onChange={(e) => setFilterMonat(e.target.value)}
          />
        </div>
        <div>
          <Label>Sparte</Label>
          <Select value={filterSparte} onValueChange={setFilterSparte}>
            <SelectTrigger>
              <SelectValue placeholder="Alle Sparten" />
            </SelectTrigger>
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
            <SelectTrigger>
              <SelectValue placeholder="Alle Trainer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle</SelectItem>
              {trainerList.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
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
                <th>Konflikte</th>
                <th>Aktion</th>
              </tr>
            </thead>
            <tbody>
              {gefilterteEinträge.map((eintrag) => {
                const konflikte = findeKonflikte(eintrag, entries);
                return (
                  <tr key={eintrag.id} className="border-b hover:bg-gray-50">
                    <td>{eintrag.datum}</td>
                    <td>{eintrag.sparte}</td>
                    <td>{eintrag.beginn}</td>
                    <td>{eintrag.ende}</td>
                    <td>{eintrag.hallenfeld}</td>
                    <td>{eintrag.funktion}</td>
                    <td>{eintrag.aufbau ? "Ja" : "Nein"}</td>
                    <td>{eintrag.trainername}</td>
                    <td>
                      {berechneVerguetung(
                        eintrag.beginn,
                        eintrag.ende,
                        eintrag.aufbau,
                        eintrag.funktion
                      )}
                    </td>
                    <td>
                      {konflikte.length > 0 ? (
                        <div className="text-xs text-red-600">
                          {konflikte.map((k, i) => (
                            <div key={i}>{k}</div>
                          ))}
                        </div>
                      ) : (
                        "✅"
                      )}
                    </td>
                    <td className="space-x-1">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(eintrag)}>
                        ✏️
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(eintrag.id)}
                      >
                        🗑️
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <h2 className="text-lg font-semibold mb-4">Eintrag bearbeiten</h2>
          {selected && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Datum</Label>
                <Input
                  type="date"
                  value={selected.datum}
                  onChange={(e) => setSelected({ ...selected, datum: e.target.value })}
                />
              </div>
              <div>
                <Label>Sparte</Label>
                <Select
                  value={selected.sparte}
                  onValueChange={(val) => setSelected({ ...selected, sparte: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sparte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Judo">Judo</SelectItem>
                    <SelectItem value="Kinderturnen">Kinderturnen</SelectItem>
                    <SelectItem value="Zirkeltraining">Zirkeltraining</SelectItem>
                    <SelectItem value="Eltern-Kind-Turnen">Eltern-Kind-Turnen</SelectItem>
                    <SelectItem value="Leistungsturnen">Leistungsturnen</SelectItem>
                    <SelectItem value="Turntraining im Parcours">
                      Turntraining im Parcours
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Beginn</Label>
                <Input
                  type="time"
                  value={selected.beginn}
                  onChange={(e) => setSelected({ ...selected, beginn: e.target.value })}
                />
              </div>
              <div>
                <Label>Ende</Label>
                <Input
                  type="time"
                  value={selected.ende}
                  onChange={(e) => setSelected({ ...selected, ende: e.target.value })}
                />
              </div>
              <div>
                <Label>Hallenfeld</Label>
                <Select
                  value={selected.hallenfeld}
                  onValueChange={(val) => setSelected({ ...selected, hallenfeld: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Feld wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Feld 1</SelectItem>
                    <SelectItem value="2">Feld 2</SelectItem>
                    <SelectItem value="3">Feld 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Funktion</Label>
                <Select
                  value={selected.funktion}
                  onValueChange={(val) => setSelected({ ...selected, funktion: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Funktion wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trainer">Trainer</SelectItem>
                    <SelectItem value="hilfstrainer">Hilfstrainer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Aufbau</Label>
                <Select
                  value={selected.aufbau ? "ja" : "nein"}
                  onValueChange={(val) => setSelected({ ...selected, aufbau: val === "ja" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Aufbau?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ja">Ja</SelectItem>
                    <SelectItem value="nein">Nein</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Trainer</Label>
                <Select
                  value={selected.trainername}
                  onValueChange={(val) => setSelected({ ...selected, trainername: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Trainer wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {trainerList.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleUpdate}>Speichern</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="mt-6">
        <h2 className="text-lg font-bold mb-2">Neuen Eintrag hinzufügen</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <Input
            type="date"
            placeholder="Datum"
            value={newEntry.datum}
            onChange={(e) => handleNewChange("datum", e.target.value)}
          />
          <Select
            value={newEntry.sparte}
            onValueChange={(val) => handleNewChange("sparte", val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sparte" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Judo">Judo</SelectItem>
              <SelectItem value="Kinderturnen">Kinderturnen</SelectItem>
              <SelectItem value="Zirkeltraining">Zirkeltraining</SelectItem>
              <SelectItem value="Eltern-Kind-Turnen">Eltern-Kind-Turnen</SelectItem>
              <SelectItem value="Leistungsturnen">Leistungsturnen</SelectItem>
              <SelectItem value="Turntraining im Parcours">
                Turntraining im Parcours
              </SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="time"
            placeholder="Beginn"
            value={newEntry.beginn}
            onChange={(e) => handleNewChange("beginn", e.target.value)}
          />
          <Input
            type="time"
            placeholder="Ende"
            value={newEntry.ende}
            onChange={(e) => handleNewChange("ende", e.target.value)}
          />
          <Select
            value={newEntry.hallenfeld}
            onValueChange={(val) => handleNewChange("hallenfeld", val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Feld wählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Feld 1</SelectItem>
              <SelectItem value="2">Feld 2</SelectItem>
              <SelectItem value="3">Feld 3</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={newEntry.funktion}
            onValueChange={(val) => handleNewChange("funktion", val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Funktion wählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="trainer">Trainer</SelectItem>
              <SelectItem value="hilfstrainer">Hilfstrainer</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={newEntry.aufbau}
            onValueChange={(val) => handleNewChange("aufbau", val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Aufbau?" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ja">Ja</SelectItem>
              <SelectItem value="nein">Nein</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={newEntry.trainername}
            onValueChange={(val) => handleNewChange("trainername", val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Trainer wählen" />
            </SelectTrigger>
            <SelectContent>
              {trainerList.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleNewSubmit}>Eintrag speichern</Button>
      </div>

      <div className="mt-8 text-center">
        <Button variant="outline" onClick={() => router.push("/start")}>
          🔙 Zur Startseite
        </Button>
      </div>
    </div>
  );
}
// Hilfsfunktionen für neue Einträge und Bearbeitung:

function handleNewChange(key: string, value: string) {
  setNewEntry((prev) => ({ ...prev, [key]: value }));
}

async function handleNewSubmit() {
  const { datum, sparte, beginn, ende, hallenfeld, funktion, aufbau, trainername } = newEntry;

  if (!datum || !sparte || !beginn || !ende || !hallenfeld || !funktion || !trainername) {
    toast.error("Bitte alle Felder ausfüllen.");
    return;
  }

  const { error } = await supabase.from("abrechnungen").insert([{
    datum,
    sparte,
    beginn,
    ende,
    hallenfeld,
    funktion,
    aufbau: aufbau === "ja",
    trainername,
  }]);

  if (!error) {
    toast.success("Eintrag erfolgreich gespeichert.");
    setNewEntry({
      datum: "",
      sparte: "",
      beginn: "",
      ende: "",
      hallenfeld: "1",
      funktion: "trainer",
      aufbau: "nein",
      trainername: "",
    });
    fetchData();
  } else {
    toast.error("Fehler beim Speichern des Eintrags.");
  }
}

// Vergütungsberechnung (hilfreich in Tabelle):

function berechneVerguetung(beginn: string, ende: string, aufbau: boolean, funktion: string) {
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
}

