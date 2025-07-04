"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { useConfirm } from "@/components/ConfirmDialog";
import dayjs from "dayjs";
import "dayjs/locale/de";
dayjs.locale("de");
import { MONTH_NAMES_DE, generateYearRange } from "@/lib/utils/dateHelpers";


interface Abrechnung {
  id: string;
  trainername: string;
  monat: number;
  jahr: number;
  summe: number;
  pdf_url: string;
  status: string;
  erstellt_am: string;
  freigabe_am?: string;
}




export default function AdminAbrechnungenPage() {
  const [abrechnungen, setAbrechnungen] = useState<Abrechnung[]>([]);
  const [loading, setLoading] = useState(false);

  const YEAR_OPTIONS = generateYearRange(1, 1);

  const [sortField, setSortField] = useState<"monat" | "jahr" | null>(null);
  const [sortAsc, setSortAsc] = useState(true);


  const [trainerList, setTrainerList] = useState<string[]>([]);
  const [selectedTrainer, setSelectedTrainer] = useState("");
  const [selectedMonat, setSelectedMonat] = useState<number>(new Date().getMonth() + 1);
  const [selectedJahr, setSelectedJahr] = useState<number>(new Date().getFullYear());

  const [filterTrainer, setFilterTrainer] = useState<string>("alle");
  const [filterMonat, setFilterMonat] = useState<number | null>(null);
  const [filterJahr, setFilterJahr] = useState<number | null>(null);

  const confirm = useConfirm();
 const router = useRouter();

const gefilterteAbrechnungen = abrechnungen.filter((a) => {
  return (
    (filterTrainer === "alle" || a.trainername === filterTrainer) &&
    (filterMonat === null || a.monat === filterMonat) &&
    (filterJahr === null || a.jahr === filterJahr)
  );
});

  const summe = gefilterteAbrechnungen.reduce((acc, a) => acc + (a.summe || 0), 0);

  const fetchAbrechnungen = async () => {
    const { data } = await supabase.from("monatsabrechnungen").select("*");
    if (data) setAbrechnungen(data);
  };

  useEffect(() => {
    fetchAbrechnungen();
  }, []);

  const erzeugePdf = async (trainername: string, monat: number, jahr: number) => {
  setLoading(true);
  toast.loading("PDF wird erstellt...", { id: "pdf" });

  try {
    const res = await fetch("/api/erzeuge-abrechnung", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trainername, monat, jahr }),
    });

    toast.dismiss("pdf");
    setLoading(false);

    if (!res.ok) {
      throw new Error("Serverantwort war nicht OK");
    }

    const json = await res.json();

    if (!json.url) {
      throw new Error("Antwort enthält keine PDF-URL");
    }

    await supabase.from("monatsabrechnungen")
      .update({ status: "erstellt", pdf_url: json.url })
      .eq("trainername", trainername)
      .eq("monat", monat)
      .eq("jahr", jahr);

    toast.success("PDF erfolgreich erstellt ✅");
    fetchAbrechnungen();

  } catch (err: unknown) {
  if (err instanceof Error) {
    toast.error("Fehler: " + err.message);
  } else {
    toast.error("Unbekannter Fehler");
  }
}
};
const resetAbrechnung = async (trainername: string, monat: number, jahr: number) => {
  const confirmed = await confirm({ message: "Abrechnung wirklich zurücksetzen und PDF löschen?" });
  if (!confirmed) return;

  const { data } = await supabase
    .from("monatsabrechnungen")
    .select("pdf_url")
    .eq("trainername", trainername)
    .eq("monat", monat)
    .eq("jahr", jahr)
    .single();

  if (data?.pdf_url) {
    const filename = data.pdf_url.split("/").pop();
    await supabase.storage.from("pdfs").remove([filename]);
  }

  await supabase
    .from("monatsabrechnungen")
    .delete()
    .eq("trainername", trainername)
    .eq("monat", monat)
    .eq("jahr", jahr);

  toast.success("Abrechnung zurückgesetzt 🔁");
  fetchAbrechnungen();
};



  const updateStatus = async (id: string, newStatus: string) => {
    await supabase.from("monatsabrechnungen").update({ status: newStatus }).eq("id", id);
    setAbrechnungen((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
    );
  };

  
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
      <div className="flex justify-center gap-4 mb-6">
        <Button variant="outline" onClick={() => router.push('/start')}>🔙 Zur Startseite</Button>
        <Button variant="default" onClick={() => router.push('/admin')}>🏠 Admin-Dashboard</Button>
      </div>

      <div className="mb-6 border-b pb-6">
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
                {MONTH_NAMES_DE.map((name, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-32">
            <label className="block text-sm mb-1">Jahr</label>
            <Select value={selectedJahr.toString()} onValueChange={(v) => setSelectedJahr(Number(v))}>
              <SelectTrigger><SelectValue placeholder="Jahr" /></SelectTrigger>
              <SelectContent>
                {YEAR_OPTIONS.map((year) => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.preventDefault();
              if (!selectedTrainer) {
                toast.error('Bitte Trainer auswählen');
                return;
              }
              erzeugePdf(selectedTrainer, selectedMonat, selectedJahr);
            }}
            disabled={loading}
          >
            {loading ? 'Wird erstellt...' : 'Abrechnung erstellen'}
          </Button>
        </div>
      </div>
<div className="flex gap-4 mb-6 flex-wrap">
  <div className="w-40">
    <label className="block text-sm mb-1">Trainer</label>
    <Select value={filterTrainer} onValueChange={setFilterTrainer}>
      <SelectTrigger><SelectValue placeholder="Alle" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="alle">Alle</SelectItem>

        {trainerList.map((name) => (
          <SelectItem key={name} value={name}>{name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
  <div className="w-32">
    <label className="block text-sm mb-1">Monat</label>
    <Select value={filterMonat?.toString() || ""} onValueChange={(v) => setFilterMonat(Number(v))}>
      <SelectTrigger><SelectValue placeholder="Alle Monate" /></SelectTrigger>
      <SelectContent>
        {MONTH_NAMES_DE.map((name, i) => (
  <SelectItem key={i + 1} value={(i + 1).toString()}>{name}</SelectItem>
))}


      </SelectContent>
    </Select>
  </div>
  <div className="w-32">
    <label className="block text-sm mb-1">Jahr</label>
    <Select value={filterJahr?.toString() || ""} onValueChange={(v) => setFilterJahr(Number(v))}>
      <SelectTrigger><SelectValue placeholder="Alle Jahre" /></SelectTrigger>
      <SelectContent>
        {YEAR_OPTIONS.map((year) => (
          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
  <div className="w-full flex justify-end mt-2">
  <Button variant="ghost" size="sm" onClick={() => {
    setFilterTrainer("alle");
    setFilterMonat(null);
    setFilterJahr(null);
  }}>
    🔄 Filter zurücksetzen
  </Button>
</div>

</div>

      <Card>
        <CardContent className="overflow-x-auto p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th>Trainer</th>
                <th>
  <button
    onClick={() => {
      setSortField("monat");
      setSortAsc((prev) => (sortField === "monat" ? !prev : true));
    }}
    className="underline"
  >
    Monat {sortField === "monat" ? (sortAsc ? "⬆️" : "⬇️") : ""}
  </button>
</th>

                <th>
  <button
    onClick={() => {
      setSortField("jahr");
      setSortAsc((prev) => (sortField === "jahr" ? !prev : true));
    }}
    className="underline"
  >
    Jahr {sortField === "jahr" ? (sortAsc ? "⬆️" : "⬇️") : ""}
  </button>
</th>

                <th>Summe (€)</th>
                <th>Status</th>
                <th>PDF</th>
                <th>Freigabe</th>
              </tr>
            </thead>
            <tbody>
             {[...gefilterteAbrechnungen]
  .sort((a, b) => {
    if (sortField === "monat") {
      return sortAsc ? a.monat - b.monat : b.monat - a.monat;
    }
    if (sortField === "jahr") {
      return sortAsc ? a.jahr - b.jahr : b.jahr - a.jahr;
    }
    return 0;
  })
  .map((a) => (



                <tr key={a.id} className="border-b hover:bg-gray-50">
                  <td>{a.trainername}</td>
                  <td>{MONTH_NAMES_DE[a.monat - 1]}</td>
                  <td>{a.jahr}</td>
                  <td>{a.summe != null ? a.summe.toFixed(2) : "-"}</td>
                  <td>
                    <Select value={a.status} onValueChange={(val) => updateStatus(a.id, val)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="offen">Offen</SelectItem>
                        <SelectItem value="erstellt">Erstellt</SelectItem>
                        <SelectItem value="bezahlt">Bezahlt</SelectItem>
                        <SelectItem value="warten-auf-freigabe">Warten auf Freigabe</SelectItem>

                      </SelectContent>
                    </Select>
                  </td>
                  <td>
                    {a.pdf_url ? (
  <div className="space-y-1">
    <a href={a.pdf_url} target="_blank" rel="noreferrer" className="text-blue-600 underline block">
      PDF
    </a>
    {a.status === "erstellt" && (
      <Button
        size="sm"
        variant="destructive"
        className="text-xs px-2 py-1"
        onClick={() => resetAbrechnung(a.trainername, a.monat, a.jahr)}
      >
        Zurücksetzen
      </Button>
    )}
  </div>
) : (
  <Button variant="outline" size="sm" onClick={() => erzeugePdf(a.trainername, a.monat, a.jahr)} disabled={loading}>
    {loading ? "Wird erstellt..." : "PDF erstellen"}
  </Button>
)}

                  </td>
                  <td>{a.freigabe_am ? dayjs(a.freigabe_am).format("DD.MM.YYYY HH:mm") : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
        <p className="text-sm mt-2 text-right font-medium">
  Gesamt-Summe: <span className="font-bold">{summe.toFixed(2)} €</span>
</p>
      </Card>


      
    </div>
  );
}
