import dayjs from "dayjs";
import { berechneVerguetung } from "@/lib/utils/berechneVerguetung";
import { pruefeKonflikte } from "@/lib/utils/pruefeKonflikte";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Abrechnung, Satz, Standardzeit } from "../page";

interface EntryListProps {
  entries: Abrechnung[];
  saetze: Satz[];
  sortAscending: boolean;
  setSortAscending: (v: boolean) => void;
  setEditEntry: (e: Abrechnung) => void;
  handleDelete: (id: string) => void;
  showAbgerechnete: boolean;
  abgerechneteKeys: Set<string>;
  ferienDaten: string[];
  standardzeiten: Standardzeit[];
}

export default function EntryList({
  entries,
  saetze,
  sortAscending,
  setSortAscending,
  setEditEntry,
  handleDelete,
  showAbgerechnete,
  abgerechneteKeys,
  ferienDaten,
  standardzeiten,
}: EntryListProps) {
  return (
    <Card>
      <CardContent className="overflow-x-auto p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th>Wochentag</th>
              <th>
                <button
                  onClick={() => setSortAscending(!sortAscending)}
                  className="underline"
                >
                  Datum {sortAscending ? "⬆️" : "⬇️"}
                </button>
              </th>
              <th>Sparte</th>
              <th>Beginn</th>
              <th>Ende</th>
              <th>Feld</th>
              <th>Funktion</th>
              <th>Aufbau</th>
              <th>Trainer</th>
              <th>Vergütung (€)</th>
              <th>Konflikt</th>
              <th>Aktion</th>
            </tr>
          </thead>
          <tbody>
            {[...entries]
              .sort((a, b) =>
                sortAscending
                  ? a.datum.localeCompare(b.datum)
                  : b.datum.localeCompare(a.datum)
              )
              .filter((e) => {
                const monat = new Date(e.datum).getMonth() + 1;
                const jahr = new Date(e.datum).getFullYear();
                const key = `${e.trainername}_${monat}_${jahr}`;
                return showAbgerechnete || !abgerechneteKeys.has(key);
              })
              .map((e) => {
                const datumObj = new Date(e.datum);
                const monat = datumObj.getUTCMonth() + 1;
                const jahr = datumObj.getUTCFullYear();
                const key = `${e.trainername}_${monat}_${jahr}`;
                const konflikte = pruefeKonflikte(
                  e,
                  entries,
                  ferienDaten,
                  standardzeiten
                );
                const istAbgerechnet = abgerechneteKeys.has(key);
                return (
                  <tr
                    key={e.id}
                    className={`border-b hover:bg-gray-50 ${
                      istAbgerechnet ? "bg-yellow-50" : ""
                    }`}
                  >
                    <td>{dayjs(e.datum).format("dddd")}</td>
                    <td>{e.datum}</td>
                    <td>{e.sparte}</td>
                    <td>{e.beginn}</td>
                    <td>{e.ende}</td>
                    <td>{e.hallenfeld}</td>
                    <td>{e.funktion}</td>
                    <td>{e.aufbau ? "Ja" : "Nein"}</td>
                    <td>{e.trainername}</td>
                    <td>
                      {berechneVerguetung(
                        e.beginn,
                        e.ende,
                        e.aufbau,
                        e.funktion,
                        e.datum.split("T")[0],
                        saetze
                      ).toFixed(2)}
                    </td>
                    <td className="text-red-600">
                      {konflikte.length > 0 && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help underline decoration-dotted">
                                ⚠ {konflikte.length} Konflikt{konflikte.length !== 1 ? "e" : ""}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <ul className="text-xs max-w-xs space-y-1">
                                {konflikte.map((k, i) => (
                                  <li key={i}>{k}</li>
                                ))}
                              </ul>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </td>
                    <td className="space-x-2">
                      {!istAbgerechnet && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditEntry(e)}
                          >
                            Bearbeiten
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(e.id)}
                          >
                            Löschen
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
