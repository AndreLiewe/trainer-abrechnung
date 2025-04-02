"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import RequireAuth from "@/components/RequireAuth";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";

// Typdefinition

type Abrechnungseintrag = {
  id: string;
  datum: string;
  sparte: string;
  beginn: string;
  ende: string;
  hallenfeld: string;
  aufbau: boolean;
  funktion: "trainer" | "hilfstrainer";
  trainername: string;
};

function editAllowed(datum: string) {
  const eintragsDatum = new Date(datum);
  const jetzt = new Date();

  const startAktuell = new Date(jetzt.getFullYear(), jetzt.getMonth(), 1);
  const startLetzter = new Date(jetzt.getFullYear(), jetzt.getMonth() - 1, 1);
  const endeLetzter = new Date(jetzt.getFullYear(), jetzt.getMonth(), 3, 23, 59, 59);

  return (
    (eintragsDatum >= startLetzter && eintragsDatum < startAktuell && jetzt <= endeLetzter) ||
    eintragsDatum >= startAktuell
  );
}

function getWochentag(datum: string) {
  try {
    const date = parseISO(datum);
    return format(date, "EEEE", { locale: de });
  } catch {
    return "-";
  }
}

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
  const [userEmail, setUserEmail] = useState("");
  const [trainerName, setTrainerName] = useState("");
  const [entries, setEntries] = useState<Abrechnungseintrag[]>([]);
  const [loadingUser, setLoadingUser] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user && user.email) {
        setUserEmail(user.email);

        const { data, error } = await supabase
          .from("trainer_profiles")
          .select("name")
          .eq("email", user.email)
          .single();

        if (!error && data) {
          setTrainerName(data.name);

          const today = new Date();
          const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          const { data: eintraege, error: eintragError } = await supabase
            .from("abrechnungen")
            .select("*")
            .eq("trainername", data.name)
            .gte("datum", lastMonth.toISOString().split("T")[0])
            .order("datum", { ascending: false });

          if (!eintragError) {
            setEntries(eintraege || []);
          } else {
            console.error("Fehler beim Laden der Einträge:", eintragError);
          }
        }
      }

      setLoadingUser(false);
    };

    getUser();
  }, []);

  const handleChange = (key: string, value: string) => {
    setFormData({ ...formData, [key]: value });
  };

  const handleSubmit = async () => {
    const { datum, sparte, beginn, ende, hallenfeld, aufbau, funktion } = formData;

    const jetzt = new Date();
    const eintragsDatum = new Date(datum);
    const startAktuell = new Date(jetzt.getFullYear(), jetzt.getMonth(), 1);
    const startLetzter = new Date(jetzt.getFullYear(), jetzt.getMonth() - 1, 1);

    const erlaubterZeitraum =
      (eintragsDatum >= startLetzter && eintragsDatum < startAktuell && jetzt <= new Date(jetzt.getFullYear(), jetzt.getMonth(), 3, 23, 59, 59)) ||
      eintragsDatum >= startAktuell;

    if (!erlaubterZeitraum) {
      toast.error("Einträge dürfen nur für den aktuellen oder letzten Monat (bis zum 3.) erstellt werden.");
      return;
    }

    if (
      !datum.trim() ||
      !sparte.trim() ||
      !beginn.trim() ||
      !ende.trim() ||
      !hallenfeld.trim() ||
      !funktion.trim() ||
      !trainerName.trim()
    ) {
      toast.error("Bitte fülle alle Pflichtfelder aus oder lade die Seite neu.");
      return;
    }

    const { error } = await supabase.from("abrechnungen").insert([
      {
        datum,
        sparte,
        beginn,
        ende,
        hallenfeld,
        aufbau: aufbau === "ja",
        funktion,
        trainername: trainerName,
      },
    ]);

    if (error) {
      toast.error("Fehler beim Speichern 😢");
      console.error(error);
    } else {
      toast.success("Abrechnung gespeichert ✅");
      setFormData({ datum: "", sparte: "", beginn: "", ende: "", hallenfeld: "1", aufbau: "nein", funktion: "trainer" });

      // Reload entries
      const today = new Date();
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const { data: updatedEntries, error: reloadError } = await supabase
        .from("abrechnungen")
        .select("*")
        .eq("trainername", trainerName)
        .gte("datum", lastMonth.toISOString().split("T")[0])
        .order("datum", { ascending: false });

      if (!reloadError) {
        setEntries(updatedEntries || []);
      }
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("Diesen Eintrag wirklich löschen?");
    if (!confirmed) return;

    const { error } = await supabase.from("abrechnungen").delete().eq("id", id);
    if (error) {
      toast.error("Löschen fehlgeschlagen.");
    } else {
      toast.success("Eintrag gelöscht.");
      setEntries((prev) => prev.filter((e) => e.id !== id));
    }
  };

  return (
    <RequireAuth>
      <div className="p-6 grid gap-6 max-w-3xl mx-auto">
        <div className="text-sm text-gray-500">⚠️ Einträge können nur bis zum 3. des Folgemonats bearbeitet oder gelöscht werden.</div>
        {/* ...Rest des JSX folgt hier, einschließlich Eingabemaske und Tabelle mit Aktionen */}
      </div>
    </RequireAuth>
  );
}