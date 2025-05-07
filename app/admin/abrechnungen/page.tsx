"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

type Abrechnung = {
  id: string;
  trainername: string;
  monat: number;
  jahr: number;
  summe: number;
  pdf_url: string;
  status: string;
  erstellt_am: string;
};

export default function AdminAbrechnungenPage() {
  const [abrechnungen, setAbrechnungen] = useState<Abrechnung[]>([]);

  useEffect(() => {
    const fetchAbrechnungen = async () => {
      const { data } = await supabase.from("monatsabrechnungen").select("*");
      if (data) setAbrechnungen(data);
    };
    fetchAbrechnungen();
  }, []);
  const erzeugePdf = async (trainername: string, monat: number, jahr: number) => {
    const res = await fetch("/api/erzeuge-abrechnung", {
      method: "POST",
      body: JSON.stringify({ trainername, monat, jahr }),
      headers: { "Content-Type": "application/json" },
    });
  
    if (res.ok) {
      alert("PDF erfolgreich erstellt ✅");
      location.reload(); // aktualisiert Tabelle
    } else {
      alert("Fehler beim Erstellen der PDF ❌");
    }
  };
  

  const updateStatus = async (id: string, newStatus: string) => {
    await supabase.from("monatsabrechnungen").update({ status: newStatus }).eq("id", id);
    setAbrechnungen((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
    );
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
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
        <Button variant="outline" size="sm" onClick={() => erzeugePdf(a.trainername, a.monat, a.jahr)}>
          PDF erstellen
        </Button>
      )}
    </td>
  </tr>
))}

            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

