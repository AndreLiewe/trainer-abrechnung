"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { capitalize } from "@/lib/utils/capitalize";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { SPARTEN } from "@/lib/constants";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/ConfirmDialog";
import FilterBar from "./components/FilterBar";
import EntryList from "./components/EntryList";
import EditForm from "./components/EditForm";
import dayjs from "dayjs";
import "dayjs/locale/de";
dayjs.locale("de");

export type Satz = {
  funktion: string;
  stundenlohn: number;
  aufbau_bonus: number;
  gültig_ab: string;
};

export type Abrechnung = {
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
export type Standardzeit = {
  sparte: string;
  wochentag: number;
  beginn: string;
  ende: string;
  gültig_ab: string;
  gültig_bis: string;
};
export default function AdminPage() {
  const [entries, setEntries] = useState<Abrechnung[]>([]);
  const [trainerList, setTrainerList] = useState<string[]>([]);
  const [filterMonat, setFilterMonat] = useState("");
  const [filterSparte, setFilterSparte] = useState("alle");
  const [filterTrainer, setFilterTrainer] = useState("alle");
  const [isAdmin, setIsAdmin] = useState(false);
  const [editEntry, setEditEntry] = useState<Abrechnung | null>(null);
  const [sortAscending, setSortAscending] = useState(true);
  const [showAbgerechnete, setShowAbgerechnete] = useState(false);
  const [abgerechneteKeys, setAbgerechneteKeys] = useState<Set<string>>(new Set());
  const [ferien, setFerien] = useState<{ datum: string }[]>([]);
  const ferienDaten = ferien.map(f => f.datum);
  const [standardzeiten, setStandardzeiten] = useState<Standardzeit[]>([]);



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

  const [saetze, setSaetze] = useState<Satz[]>([]);

useEffect(() => {
  const ladeSaetze = async () => {
    const { data } = await supabase.from("vergütungssätze").select("*");
    setSaetze(data || []);
  };
  if (isAdmin) ladeSaetze();
}, [isAdmin]);
useEffect(() => {
  const ladeKonfliktDaten = async () => {
    const { data: ferienData } = await supabase.from("ferien_feiertage").select("datum");
    const { data: standardData } = await supabase.from("standardzeiten").select("*");
    setFerien(ferienData || []);
    setStandardzeiten((standardData || []).map(s => ({ ...s, wochentag: Number(s.wochentag) })));

  };
  if (isAdmin) ladeKonfliktDaten();
}, [isAdmin]);


  useEffect(() => {
  const ladeAbgerechnete = async () => {
    const { data } = await supabase
      .from("monatsabrechnungen")
      .select("monat,jahr,trainername")
      .in("status", ["erstellt", "warten-auf-freigabe", "offen", "bezahlt"])

    if (data) {
      const keyset = new Set<string>(
        data.map((a) => `${a.trainername}_${a.monat}_${a.jahr}`)
      );
      setAbgerechneteKeys(keyset);
    }
  };
  if (isAdmin) ladeAbgerechnete();
}, [isAdmin]);

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({ message: "Wirklich löschen?" });
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
        funktion: capitalize(funktion),
        aufbau: aufbau === "ja",
        trainername,
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
      {editEntry && (
        <EditForm
          entry={editEntry}
          trainerList={trainerList}
          setEntry={setEditEntry}
          onCancel={() => setEditEntry(null)}
          onSave={async () => {
            if (!editEntry) return;
            const { error } = await supabase
              .from("abrechnungen")
              .update({ ...editEntry, funktion: capitalize(editEntry.funktion) })
              .eq("id", editEntry.id);
            if (!error) {
              setEditEntry(null);
              fetchData();
            } else {
              alert("Fehler beim Speichern");
              console.error(error);
            }
          }}
        />
      )}
      <FilterBar
        filterMonat={filterMonat}
        onFilterMonatChange={setFilterMonat}
        filterSparte={filterSparte}
        onFilterSparteChange={setFilterSparte}
        filterTrainer={filterTrainer}
        onFilterTrainerChange={setFilterTrainer}
        showAbgerechnete={showAbgerechnete}
        onToggleShowAbgerechnete={() => setShowAbgerechnete((v) => !v)}
        trainerList={trainerList}
      />

      <EntryList
        entries={entries}
        saetze={saetze}
        sortAscending={sortAscending}
        setSortAscending={setSortAscending}
        setEditEntry={setEditEntry}
        handleDelete={handleDelete}
        showAbgerechnete={showAbgerechnete}
        abgerechneteKeys={abgerechneteKeys}
        ferienDaten={ferienDaten}
        standardzeiten={standardzeiten}
      />

      <div className="mt-6">
        <h2 className="text-lg font-bold mb-2">Neuen Eintrag hinzufügen</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <Input type="date" placeholder="Datum" value={newEntry.datum} onChange={(e) => handleNewChange("datum", e.target.value)} />
          <Select value={newEntry.sparte} onValueChange={(val) => handleNewChange("sparte", val)}>
            <SelectTrigger><SelectValue placeholder="Sparte" /></SelectTrigger>
            <SelectContent>
              {SPARTEN.map((sparte) => (
                <SelectItem key={sparte} value={sparte}>
                  {sparte}
                </SelectItem>
              ))}
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

      <div className="mt-8 flex justify-center gap-4">
  <Button variant="outline" onClick={() => router.push("/start")}>
    🔙 Zur Startseite
  </Button>
  <Button variant="default" onClick={() => router.push("/admin/abrechnungen")}>
    📄 Monatsabrechnungen
  </Button>
  <Button variant="default" onClick={() => router.push("/admin/korrekturen")}>
  ✏️ Korrekturen verwalten
</Button>
  <Button variant="default" onClick={() => router.push("/admin/gruppen")}>
    👥 Gruppenverwaltung
  </Button>
  <Button variant="default" onClick={() => router.push("/admin/mitglieder")}>
    👤 Mitgliederverwaltung
  </Button>
</div>

    </div>
  );
}


