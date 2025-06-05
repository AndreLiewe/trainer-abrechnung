import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { generateTrainerPDF } from "@/lib/pdf/generateTrainerPDF";
import { berechneVerguetung } from "@/lib/utils/berechneVerguetung";


export const dynamic = "force-dynamic";

function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "_")           // Leerzeichen → Unterstrich
    .replace(/[äÄ]/g, "ae")
    .replace(/[öÖ]/g, "oe")
    .replace(/[üÜ]/g, "ue")
    .replace(/[ß]/g, "ss")
    .replace(/[^a-z0-9_\-\.]/g, ""); // Entferne sonstige Sonderzeichen
}

export async function POST(req: Request) {
  

  
  try {
   
   
    const { trainername, monat, jahr } = await req.json();
    console.log("[DEBUG] Eingangsdaten:", trainername, monat, jahr);

    const von = `${jahr}-${String(monat).padStart(2, "0")}-01`;
    const bisDate = new Date(Number(jahr), Number(monat), 1);
    bisDate.setMonth(bisDate.getMonth() + 1);
    const bis = bisDate.toISOString().split("T")[0];

   // 1. Normale Einträge
const { data: eintraegeRaw, error: err1 } = await supabaseAdmin
  .from("abrechnungen")
  .select("*")
  .eq("trainername", trainername)
  .gte("datum", von)
  .lt("datum", bis);

if (err1) {
  return NextResponse.json({ error: "Fehler beim Laden der Einträge", details: err1.message }, { status: 500 });
}

// 2. Korrekturen
const { data: korrekturenRaw, error: err2 } = await supabaseAdmin
  .from("korrekturen")
  .select("*")
  .eq("trainername", trainername)
  .gte("erstellt_am", von)
  .lt("erstellt_am", bis);

if (err2) {
  return NextResponse.json({ error: "Fehler beim Laden der Korrekturen", details: err2.message }, { status: 500 });
}

// 3. Vergütungssätze (duplikat entfernen wenn vorher schon geladen)
const { data: saetze, error: satzError } = await supabaseAdmin
  .from("vergütungssätze")
  .select("*");

if (satzError || !saetze) {
  return NextResponse.json({ error: "Fehler beim Laden der Vergütungssätze", details: satzError?.message }, { status: 500 });
}

// 4. Mapping finaler Einträge
const finalList = [];

for (const e of eintraegeRaw || []) {
  const betrag = berechneVerguetung(e.beginn, e.ende, e.aufbau, e.funktion, e.datum, saetze);
  finalList.push({ ...e, betrag, typ: "normal" });
}

for (const k of korrekturenRaw || []) {
  if (k.typ === "nachtrag") {
    const betrag = berechneVerguetung(k.beginn, k.ende, k.aufbau, k.funktion, k.datum, saetze);
    finalList.push({ ...k, betrag, typ: "nachtrag" });
  } else if (k.typ === "stornierung" || k.typ === "korrektur") {
    // original laden
    const { data: original } = await supabaseAdmin
      .from("abrechnungen")
      .select("*")
      .eq("id", k.original_id)
      .single();

    if (original) {
      const origBetrag = berechneVerguetung(original.beginn, original.ende, original.aufbau, original.funktion, original.datum, saetze);
      finalList.push({ ...original, betrag: -1 * origBetrag, typ: "korrektur-alt" });
    }

    if (k.typ === "korrektur") {
      const betrag = berechneVerguetung(k.beginn, k.ende, k.aufbau, k.funktion, k.datum, saetze);
      finalList.push({ ...k, betrag, typ: "korrektur-neu" });
    }
  }
}

if (finalList.length === 0) {
  return NextResponse.json({ error: "Keine Einträge für Abrechnung vorhanden" }, { status: 404 });
}

const summe = finalList.reduce((sum, e) => sum + e.betrag, 0);
console.log("[DEBUG] Summe berechnet:", summe);

const pdfBuffer = await generateTrainerPDF({
  eintraege: finalList,
  trainerName: trainername,
  monat: String(monat).padStart(2, "0"),
  jahr: String(jahr),
});


    const safeName = sanitizeFileName(trainername);
    const filename = `abrechnung-${safeName}-${monat}-${jahr}.pdf`;


    const { error: uploadError } = await supabaseAdmin.storage
      .from("pdfs")
      .upload(filename, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("[UPLOAD-ERROR]", uploadError.message);
      return NextResponse.json({ error: "Upload fehlgeschlagen", details: uploadError.message }, { status: 500 });
    }

    const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/pdfs/${filename}`;
    console.log("[DEBUG] PDF URL:", publicUrl);

    const { error: insertError } = await supabaseAdmin.from("monatsabrechnungen").upsert([{
      trainername,
      monat,
      jahr,
      status: "erstellt",
      pdf_url: publicUrl,
      summe,
      erstell_am: new Date().toISOString(),
    }]);

    if (insertError) {
      console.error("[UPSERT-ERROR]", insertError.message);
      return NextResponse.json({ error: "Eintrag speichern fehlgeschlagen", details: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ url: publicUrl, summe });

  } catch (err: unknown) {
    console.error("[UNEXPECTED ERROR]", err);
    return NextResponse.json(
      {
        error: "Fehler beim Erstellen der PDF",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
