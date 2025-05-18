"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function KorrekturPage() {
  const [trainername, setTrainername] = useState("");
  const [originalList, setOriginalList] = useState<any[]>([]);
  const [korrekturen, setKorrekturen] = useState<any[]>([]);
  const [originalId, setOriginalId] = useState("");
  const [formData, setFormData] = useState({
    datum: "",
    beginn: "",
    ende: "",
    sparte: "",
    funktion: "",
    hallenfeld: "",
    aufbau: "",
    typ: "nachtrag",
  });

  const router = useRouter();

  useEffect(() => {
    const loadData = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const email = userData?.user?.email;
      if (!email) return;

      const { data: profile } = await supabase
        .from("trainer_profiles")
        .select("name")
        .eq("email", email)
        .single();

      if (!profile?.name) return;

      setTrainername(profile.name);

      const { data: eintraege } = await supabase
        .from("abrechnungen")
        .select("*")
        .eq("trainername", profile.name);

      setOriginalList(eintraege || []);

      const { data: korrekte } = await supabase
        .from("korrekturen")
        .select("*")
        .eq("trainername", profile.name);

      setKorrekturen(korrekte || []);
    };

    loadData();
  }, []);

  const handleSubmit = async () => {
    const { datum, beginn, ende, sparte, funktion, hallenfeld, aufbau, typ } = formData;
    if (!datum || !beginn || !ende || !sparte || !funktion || !hallenfeld || !aufbau || !typ) {
      toast.error("Bitte alle Felder ausfüllen");
      return;
    }

    const insertObj = {
      trainername,
      original_id: typ === "nachtrag" ? null : originalId,
      datum,
      beginn,
      ende,
      sparte,
      funktion,
      hallenfeld,
      aufbau: aufbau === "ja",
      typ,
    };

    const { error } = await supabase.from("korrekturen").insert([insertObj]);

    if (error) {
      toast.error("Fehler beim Speichern");
    } else {
      toast.success("Korrektur gespeichert ✅");
      router.refresh();
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🛠️ Korrekturbuchung</h1>

      {/* Eingabeformular */}
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label>Typ</label>
          <Select value={formData.typ} onValueChange={(val) => setFormData({ ...formData, typ: val })}>
            <SelectTrigger><SelectValue placeholder="Typ wählen" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="nachtrag">Nachtrag</SelectItem>
              <SelectItem value="korrektur">Korrektur</SelectItem>
              <SelectItem value="stornierung">Stornierung</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {formData.typ !== "nachtrag" && (
          <div>
            <label>Originaleintrag</label>
            <Select value={originalId} onValueChange={setOriginalId}>
              <SelectTrigger><SelectValue placeholder="Eintrag wählen" /></SelectTrigger>
              <SelectContent>
                {originalList.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.datum} | {e.beginn}-{e.ende} | {e.sparte}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Input type="date" placeholder="Datum" value={formData.datum} onChange={(e) => setFormData({ ...formData, datum: e.target.value })} />
        <Input type="time" placeholder="Beginn" value={formData.beginn} onChange={(e) => setFormData({ ...formData, beginn: e.target.value })} />
        <Input type="time" placeholder="Ende" value={formData.ende} onChange={(e) => setFormData({ ...formData, ende: e.target.value })} />

        <Select value={formData.sparte} onValueChange={(val) => setFormData({ ...formData, sparte: val })}>
          <SelectTrigger><SelectValue placeholder="Sparte wählen" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Judo">Judo</SelectItem>
            <SelectItem value="Kinderturnen">Kinderturnen</SelectItem>
            <SelectItem value="Zirkeltraining">Zirkeltraining</SelectItem>
            <SelectItem value="Eltern-Kind-Turnen">Eltern-Kind-Turnen</SelectItem>
          </SelectContent>
        </Select>

        <Select value={formData.funktion} onValueChange={(val) => setFormData({ ...formData, funktion: val })}>
          <SelectTrigger><SelectValue placeholder="Funktion wählen" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="trainer">Trainer</SelectItem>
            <SelectItem value="hilfstrainer">Hilfstrainer</SelectItem>
          </SelectContent>
        </Select>

        <Select value={formData.aufbau} onValueChange={(val) => setFormData({ ...formData, aufbau: val })}>
          <SelectTrigger><SelectValue placeholder="Aufbau?" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ja">Ja</SelectItem>
            <SelectItem value="nein">Nein</SelectItem>
          </SelectContent>
        </Select>

        <Select value={formData.hallenfeld} onValueChange={(val) => setFormData({ ...formData, hallenfeld: val })}>
          <SelectTrigger><SelectValue placeholder="Feld wählen" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Feld 1</SelectItem>
            <SelectItem value="2">Feld 2</SelectItem>
            <SelectItem value="3">Feld 3</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex justify-between mt-4">
          <Button variant="ghost" onClick={() => router.push("/admin")}>🔙 Zurück</Button>
          <Button onClick={handleSubmit}>💾 Speichern</Button>
        </div>
      </div>

      {/* Auflistung Korrekturen */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-2">🗃️ Deine bisherigen Korrekturen</h2>
        {korrekturen.length === 0 ? (
          <p className="text-sm text-gray-500">Noch keine Korrekturen vorhanden.</p>
        ) : (
          <ul className="text-sm space-y-2">
            {korrekturen.map((k) => (
              <li key={k.id} className="border rounded p-2">
                [{k.typ}] {k.datum} – {k.beginn} bis {k.ende} – {k.sparte} ({k.funktion}) {k.aufbau ? "+Aufbau" : ""}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
