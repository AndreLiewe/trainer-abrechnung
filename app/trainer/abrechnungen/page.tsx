"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import RequireAuth from "@/components/RequireAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ConfirmDialog";
import { toast } from "sonner";
import { MONTH_NAMES_DE } from "@/lib/utils/dateHelpers";

type Abrechnung = {
  id: string;
  trainername: string;
  monat: number;
  jahr: number;
  status: string;
  pdf_url: string;
};


export default function MeineAbrechnungen() {
  const confirm = useConfirm();

  const [abrechnungen, setAbrechnungen] = useState<Abrechnung[]>([]);
  const [loading, setLoading] = useState(true);
  const freigeben = async (id: string) => {
  const confirmed = await confirm({ message: "Abrechnung jetzt freigeben?" });
  if (!confirmed) return;

  const { error } = await supabase
    .from("monatsabrechnungen")
    .update({ status: "offen", freigabe_am: new Date().toISOString() })
    .eq("id", id);

  if (!error) {
    toast.success("Abrechnung freigegeben ✅");
    setAbrechnungen((prev) =>
      prev.map((a) => a.id === id ? { ...a, status: "offen" } : a)
    );
  } else {
    toast.error("Fehler beim Freigeben ❌");
    console.error(error);
  }
};



  useEffect(() => {
    const fetchAbrechnungen = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !user.email) return;

      const { data: profile, error: profileError } = await supabase
        .from("trainer_profiles")
        .select("name")
        .eq("email", user.email)
        .single();

      if (profileError || !profile) {
        toast.error("Profil konnte nicht geladen werden.");
        return;
      }

      

      const { data, error } = await supabase
        .from("monatsabrechnungen")
        .select("*")
        .eq("trainername", profile.name)
        .order("jahr", { ascending: false })
        .order("monat", { ascending: false });

      if (error) {
        toast.error("Fehler beim Laden der Abrechnungen.");
        console.error(error);
      } else {
        setAbrechnungen(data || []);
      }

      setLoading(false);
    };

    fetchAbrechnungen();
  }, []);

  return (
    <RequireAuth>
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Meine Monatsabrechnungen</h1>

        <Card>
          <CardContent className="p-4">
            {loading ? (
              <p>Lade…</p>
            ) : abrechnungen.length === 0 ? (
              <p className="text-sm text-gray-500">Noch keine Abrechnungen vorhanden.</p>
            ) : (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="p-2">Monat</th>
                    <th className="p-2">Jahr</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Download</th>
                    <th className="p-2">Freigabe</th>
                  </tr>
                </thead>
                <tbody>
                  {abrechnungen.map((eintrag) => (
                    <tr key={eintrag.id} className="border-b">
                      <td className="p-2">{MONTH_NAMES_DE[eintrag.monat - 1]}</td>
                      <td className="p-2">{eintrag.jahr}</td>
                      <td className="p-2 capitalize">{eintrag.status}</td>
                      <td className="p-2">
                        {eintrag.pdf_url ? (
                          <a
                            href={eintrag.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            📄 PDF
                          </a>
                        ) : (
                          <span className="text-gray-400 italic">Noch nicht verfügbar</span>
                        )}
                      </td>
                      {eintrag.status === "warten-auf-freigabe" && (
  <td className="p-2">
    <Button size="sm" className="text-xs px-2 py-1" onClick={() => freigeben(eintrag.id)}>
      ✅ Freigeben?
    </Button>
  </td>
)}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Button variant="ghost" className="mt-4" onClick={() => window.history.back()}>
          🔙 Zurück
        </Button>
      </div>
    </RequireAuth>
  );
}
