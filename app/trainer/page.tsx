"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import RequireAuth from "@/components/RequireAuth";
import { useRouter } from "next/navigation";

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

export default function TrainerAbrechnung() {
  const [formData, setFormData] = useState({
    datum: "",
    sparte: "",
    beginn: "",
    ende: "",
    hallenfeld: "1",
    aufbau: "nein",
    funktion: "trainer",
  });

  const [userEmail, setUserEmail] = useState("");
  const [trainerName, setTrainerName] = useState("");
  const [entries, setEntries] = useState<Abrechnungseintrag[]>([]);
  const [loadingUser, setLoadingUser] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user && user.email) {
        setUserEmail(user.email);

        const { data, error } = await supabase
          .from("trainer_profiles")
          .select("name")
          .eq("email", user.email)
          .single();

        if (!error && data) {
          setTrainerName(data.name);

          const today = new Date();
          const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          const { data: eintraege, error: eintragError } = await supabase
            .from("abrechnungen")
            .select("*")
            .eq("trainername", data.name)
            .gte("datum", lastMonth.toISOString().split("T")[0])
            .order("datum", { ascending: false });

          if (!eintragError) {
            setEntries(eintraege || []);
          } else {
            console.error("Fehler beim Laden der Einträge:", eintragError);
          }
        }
      }

      setLoadingUser(false);
    };

    getUser();
  }, []);

  const handleChange = (key: string, value: string) => {
    setFormData({ ...formData, [key]: value });
  };

  const handleSubmit = async () => {
    const { datum, sparte, beginn, ende, hallenfeld, aufbau, funktion } = formData;

    if (
      !datum.trim() ||
      !sparte.trim() ||
      !beginn.trim() ||
      !ende.trim() ||
      !hallenfeld.trim() ||
      !funktion.trim() ||
      !trainerName.trim()
    ) {
      alert("Bitte fülle alle Pflichtfelder aus oder lade die Seite neu.");
      return;
    }

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
      alert("Fehler beim Speichern 😢");
      console.error(error);
    } else {
      alert("Abrechnung gespeichert ✅");
      setFormData({
        datum: "",
        sparte: "",
        beginn: "",
        ende: "",
        hallenfeld: "1",
        aufbau: "nein",
        funktion: "trainer",
      });

      // Reload entries after submit
      const today = new Date();
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const { data: updatedEntries, error: reloadError } = await supabase
        .from("abrechnungen")
        .select("*")
        .eq("trainername", trainerName)
        .gte("datum", lastMonth.toISOString().split("T")[0])
        .order("datum", { ascending: false });

      if (!reloadError) {
        setEntries(updatedEntries || []);
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <RequireAuth>
      {loadingUser ? (
        <div className="p-6 text-center text-gray-500">Lade Nutzerdaten…</div>
      ) : (
        <div className="p-6 grid gap-6 max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Trainer-Abrechnung</h1>
            <div className="text-right text-sm">
              <p className="text-gray-600">{userEmail}</p>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Datum</Label>
                  <Input type="date" value={formData.datum} onChange={(e) => handleChange("datum", e.target.value)} />
                </div>
                <div>
                  <Label>Sparte</Label>
                  <Select value={formData.sparte} onValueChange={(val) => handleChange("sparte", val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sparte wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Judo">Judo</SelectItem>
                      <SelectItem value="Eltern-Kind-Turnen">Eltern-Kind-Turnen</SelectItem>
                      <SelectItem value="Zirkeltraining">Zirkeltraining</SelectItem>
                      <SelectItem value="Kinderturnen">Kinderturnen</SelectItem>
                      <SelectItem value="Leistungsturnen">Leistungsturnen</SelectItem>
                      <SelectItem value="Turntraining im Parcours">Turntraining im Parcours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Beginn</Label>
                  <Input type="time" value={formData.beginn} onChange={(e) => handleChange("beginn", e.target.value)} />
                </div>
                <div>
                  <Label>Ende</Label>
                  <Input type="time" value={formData.ende} onChange={(e) => handleChange("ende", e.target.value)} />
                </div>
                <div>
                  <Label>Hallenfeld</Label>
                  <Select value={formData.hallenfeld} onValueChange={(val) => handleChange("hallenfeld", val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Wähle Feld" />
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
                  <Select value={formData.funktion} onValueChange={(val) => handleChange("funktion", val)}>
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
                  <Label>Aufbau geleistet?</Label>
                  <Select value={formData.aufbau} onValueChange={(val) => handleChange("aufbau", val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Aufbau?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ja">Ja</SelectItem>
                      <SelectItem value="nein">Nein</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button className="mt-4 w-full" onClick={handleSubmit}>
                Abrechnung einreichen
              </Button>
              <Button variant="ghost" className="mt-2 w-full" onClick={() => router.push("/start")}>
                🔙 Zur Startseite
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h2 className="text-lg font-semibold mb-4">Meine bisherigen Einträge</h2>
              {entries.length === 0 ? (
                <p className="text-sm text-gray-500">Keine Einträge gefunden.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="p-2">Datum</th>
                        <th className="p-2">Sparte</th>
                        <th className="p-2">Beginn</th>
                        <th className="p-2">Ende</th>
                        <th className="p-2">Funktion</th>
                        <th className="p-2">Aufbau</th>
                        <th className="p-2">Feld</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((eintrag) => (
                        <tr key={eintrag.id} className="border-b">
                          <td className="p-2">{eintrag.datum}</td>
                          <td className="p-2">{eintrag.sparte}</td>
                          <td className="p-2">{eintrag.beginn}</td>
                          <td className="p-2">{eintrag.ende}</td>
                          <td className="p-2">{eintrag.funktion}</td>
                          <td className="p-2">{eintrag.aufbau ? "Ja" : "Nein"}</td>
                          <td className="p-2">{eintrag.hallenfeld}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </RequireAuth>
  );
}
