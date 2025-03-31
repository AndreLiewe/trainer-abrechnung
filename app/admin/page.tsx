"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function AdminDashboard() {
  const [entries, setEntries] = useState<any[]>([]);
  const [filterMonat, setFilterMonat] = useState("");
  const [filterSparte, setFilterSparte] = useState("");

  useEffect(() => {
    fetchData();
  }, [filterMonat, filterSparte]);

  const fetchData = async () => {
    let query = supabase.from("abrechnungen").select("*");
    if (filterMonat) {
      query = query.gte("datum", `${filterMonat}-01`).lte("datum", `${filterMonat}-31`);
    }
    if (filterSparte) {
      query = query.eq("sparte", filterSparte);
    }
    const { data, error } = await query;
    if (!error) setEntries(data);
  };

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