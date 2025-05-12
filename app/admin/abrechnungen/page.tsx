"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import toast, { Toaster } from "react-hot-toast";

interface Abrechnung {
  id: string;
  trainername: string;
  monat: number;
  jahr: number;
  summe: number;
  pdf_url: string;
  status: string;
  erstellt_am: string;
}

export default function AdminAbrechnungenPage() {
  const [abrechnungen, setAbrechnungen] = useState<Abrechnung[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAbrechnungen = async () => {
      const { data } = await supabase.from("monatsabrechnungen").select("*");
      if (data) setAbrechnungen(data);
    };
    fetchAbrechnungen();
  }, []);

  const erzeugePdf = async (trainername: string, monat: number, jahr: number) => {
    setLoading(true);
    toast.loading("PDF wird erstellt...", { id: "pdf" });
    const res = await fetch("/api/erzeuge-abrechnung", {
      method: "POST",
      body: JSON.stringify({ trainername, monat, jahr }),
      headers: { "Content-Type": "application/json" },
    });

    toast.dismiss("pdf");
    setLoading(false);

    if (res.ok) {
      const { url }: { url: string } = await res.json();
      await supabase.from("monatsabrechnungen")
        .update({ status: "erstellt", pdf_url: url })
        .eq("trainername", trainername)
        .eq("monat", monat)
        .eq("jahr", jahr);
      toast.success("PDF erfolgreich erstellt ✅");
      location.reload();
    } else {
      toast.error("Fehler beim Erstellen der PDF ❌");
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    await supabase.from("monatsabrechnungen").update({ status: newStatus }).eq("id", id);
    setAbrechnungen((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
    );
  };

  const [trainerList, setTrainerList] = useState<string[]>([]);
  const [selectedTrainer, setSelectedTrainer] = useState("");
  const [selectedMonat, setSelectedMonat] = useState<number>(new Date().getMonth() + 1);
  const [selectedJahr, setSelectedJahr] = useState<number>(new Date().getFullYear());

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

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Toaster />
      <h1 className="text-2xl font-bold mb-4">📄 Monatsabrechnungen</h1>

      <Card>
        <CardContent className="overflow-x-auto p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th>Trainer</th>
                <th>Monat</th>
                <th>Jahr</th>
                <th>Summe (€)</th>
                <th>Status</th>
                <th>PDF</th>
              </tr>
            </thead>
            <tbody>
              {abrechnungen.map((a) => (
                <tr key={a.id} className="border-b hover:bg-gray-50">
                  <td>{a.trainername}</td>
                  <td>{a.monat}</td>
                  <td>{a.jahr}</td>
                  <td>{a.summe != null ? a.summe.toFixed(2) : "-"}</td>
                  <td>
                    <Select value={a.status} onValueChange={(val) => updateStatus(a.id, val)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="offen">Offen</SelectItem>
                        <SelectItem value="erstellt">Erstellt</SelectItem>
                        <SelectItem value="bezahlt">Bezahlt</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td>
                    {a.pdf_url ? (
                      <a href={a.pdf_url} target="_blank" rel="noreferrer" className="text-blue-600 underline">PDF</a>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => erzeugePdf(a.trainername, a.monat, a.jahr)} disabled={loading}>
                        {loading ? "Wird erstellt..." : "PDF erstellen"}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="mt-6 border-t pt-6">
        <h2 className="text-lg font-semibold mb-4">Neue Abrechnung erstellen</h2>

        <div className="flex flex-wrap gap-4 items-end">
          <div className="w-40">
            <label className="block text-sm mb-1">Trainer</label>
            <Select value={selectedTrainer} onValueChange={setSelectedTrainer}>
              <SelectTrigger><SelectValue placeholder="Wählen..." /></SelectTrigger>
              <SelectContent>
                {trainerList.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-32">
            <label className="block text-sm mb-1">Monat</label>
            <Select value={selectedMonat.toString()} onValueChange={(v) => setSelectedMonat(Number(v))}>
              <SelectTrigger><SelectValue placeholder="Monat" /></SelectTrigger>
              <SelectContent>
                {[...Array(12)].map((_, i) => (
                  <SelectItem key={i+1} value={(i+1).toString()}>{i+1}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-32">
            <label className="block text-sm mb-1">Jahr</label>
            <Select value={selectedJahr.toString()} onValueChange={(v) => setSelectedJahr(Number(v))}>
              <SelectTrigger><SelectValue placeholder="Jahr" /></SelectTrigger>
              <SelectContent>
                {[2024, 2025].map((year) => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
          type="button" // ← NICHT "submit"!
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
  e.preventDefault();
  if (!selectedTrainer) {
    toast.error("Bitte Trainer auswählen");
    return;
  }
  erzeugePdf(selectedTrainer, selectedMonat, selectedJahr);
}}

            disabled={loading}
          >
            {loading ? "Wird erstellt..." : "Abrechnung erstellen"}
          </Button>
        </div>
      </div>

      <div className="mt-8 text-center">
        <Button variant="ghost" onClick={() => window.history.back()}>
          🔙 Zurück
        </Button>
      </div>
    </div>
  );
}