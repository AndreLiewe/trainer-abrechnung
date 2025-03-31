"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useState } from "react";

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

  const handleChange = (key, value) => {
    setFormData({ ...formData, [key]: value });
  };

  return (
    <div className="p-6 grid gap-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">Trainer-Abrechnung einreichen</h1>
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
          <Button className="mt-4 w-full">Abrechnung einreichen</Button>
        </CardContent>
      </Card>
    </div>
  );
}
