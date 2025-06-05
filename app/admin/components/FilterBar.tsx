import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { SPARTEN } from "@/lib/constants";

interface FilterBarProps {
  filterMonat: string;
  onFilterMonatChange: (val: string) => void;
  filterSparte: string;
  onFilterSparteChange: (val: string) => void;
  filterTrainer: string;
  onFilterTrainerChange: (val: string) => void;
  showAbgerechnete: boolean;
  onToggleShowAbgerechnete: () => void;
  trainerList: string[];
}

export default function FilterBar({
  filterMonat,
  onFilterMonatChange,
  filterSparte,
  onFilterSparteChange,
  filterTrainer,
  onFilterTrainerChange,
  showAbgerechnete,
  onToggleShowAbgerechnete,
  trainerList,
}: FilterBarProps) {
  return (
    <div className="flex gap-4 mb-6 flex-wrap">
      <div>
        <Label>Monat</Label>
        <Input
          type="month"
          value={filterMonat}
          onChange={(e) => onFilterMonatChange(e.target.value)}
        />
      </div>
      <div>
        <Label>Sparte</Label>
        <Select value={filterSparte} onValueChange={onFilterSparteChange}>
          <SelectTrigger>
            <SelectValue placeholder="Alle Sparten" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle</SelectItem>
            {SPARTEN.map((sparte) => (
              <SelectItem key={sparte} value={sparte}>
                {sparte}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="mb-4">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={showAbgerechnete}
            onChange={onToggleShowAbgerechnete}
          />
          <span>Auch bereits abgerechnete Einträge anzeigen</span>
        </label>
      </div>
      <div>
        <Label>Trainer</Label>
        <Select value={filterTrainer} onValueChange={onFilterTrainerChange}>
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
  );
}
