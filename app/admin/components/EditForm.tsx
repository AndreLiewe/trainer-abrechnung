import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SPARTEN } from "@/lib/constants";
import { Abrechnung } from "../page";

interface EditFormProps {
  entry: Abrechnung;
  trainerList: string[];
  setEntry: (e: Abrechnung) => void;
  onCancel: () => void;
  onSave: () => void;
}

export default function EditForm({
  entry,
  trainerList,
  setEntry,
  onCancel,
  onSave,
}: EditFormProps) {
  return (
    <div className="fixed inset-0 bg-white bg-opacity-80 backdrop-blur-sm flex justify-center items-center z-50">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-2xl space-y-4">
        <h2 className="text-lg font-bold">Eintrag bearbeiten</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Input
            type="date"
            value={entry.datum}
            onChange={(e) => setEntry({ ...entry, datum: e.target.value })}
          />
          <Select
            value={entry.sparte}
            onValueChange={(val) => setEntry({ ...entry, sparte: val })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sparte" />
            </SelectTrigger>
            <SelectContent>
              {SPARTEN.map((sparte) => (
                <SelectItem key={sparte} value={sparte}>
                  {sparte}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="time"
            value={entry.beginn}
            onChange={(e) => setEntry({ ...entry, beginn: e.target.value })}
          />
          <Input
            type="time"
            value={entry.ende}
            onChange={(e) => setEntry({ ...entry, ende: e.target.value })}
          />
          <Select
            value={entry.hallenfeld}
            onValueChange={(val) => setEntry({ ...entry, hallenfeld: val })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Feld" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Feld 1</SelectItem>
              <SelectItem value="2">Feld 2</SelectItem>
              <SelectItem value="3">Feld 3</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={entry.funktion}
            onValueChange={(val) => setEntry({ ...entry, funktion: val })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="trainer">Trainer</SelectItem>
              <SelectItem value="hilfstrainer">Hilfstrainer</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={entry.aufbau ? "ja" : "nein"}
            onValueChange={(val) => setEntry({ ...entry, aufbau: val === "ja" })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ja">Ja</SelectItem>
              <SelectItem value="nein">Nein</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={entry.trainername}
            onValueChange={(val) => setEntry({ ...entry, trainername: val })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Trainer" />
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
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Abbrechen
          </Button>
          <Button onClick={onSave}>Speichern</Button>
        </div>
      </div>
    </div>
  );
}
