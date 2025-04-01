"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type Abrechnung = {
  id: string;
  datum: string;
  sparte: string;
  beginn: string;
  ende: string;
  hallenfeld: string;
  funktion: string;
  aufbau: boolean;
  status?: string;
};

export default function AdminDashboard() {
  const [entries, setEntries] = useState<Abrechnung[]>([]);
  const [filterMonat, setFilterMonat] = useState("");
  const [filterSparte, setFilterSparte] = useState("alle");

  const fetchData = useCallback(async () => {
    console.log("Filter Monat:", filterMonat);
    console.log("Filter Sparte:", filterSparte);
  
    let query = supabase.from("abrechnungen").select("*");
  
    if (filterMonat) {
  const start = `${filterMonat}-01`;
  const endDate = new Date(filterMonat + "-01");
  endDate.setMonth(endDate.getMonth() + 1);
  endDate.setDate(0); // letzter Tag des Monats
  const end = endDate.toISOString().split("T")[0];

  query = query.gte("datum", start).lte("datum", end);
}

  
    if (filterSparte && filterSparte !== "alle") {
      query = query.eq("sparte", filterSparte);
    }
  
    const { data, error } = await query;
    if (error) {
      console.error("Supabase-Fehler:", error);
    } else {
      console.log("Gefundene Einträge:", data);
      setEntries(data);
    }
  }, [filterMonat, filterSparte]);
  

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    await supabase.from("abrechnungen").update({ status: newStatus }).eq("id", id);
    fetchData();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Admin-Dashboard</h1>

      <div className="flex gap-4 mb-6">
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
                <th>Status</th>
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
                  <td>
                    <Select value={e.status || "Eingereicht"} onValueChange={(val) => handleStatusChange(e.id, val)}>
                      <SelectTrigger className="w-[150px]">
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
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
