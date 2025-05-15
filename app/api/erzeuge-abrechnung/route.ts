import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { generateTrainerPDF } from "@/lib/pdf/generateTrainerPDF";

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
    const bis = `${jahr}-${String(monat + 1).padStart(2, "0")}-01`;

    const { data: eintraege, error } = await supabaseAdmin
      .from("abrechnungen")
      .select("datum, sparte, beginn, ende, funktion, aufbau")
      .eq("trainername", trainername)
      .gte("datum", von)
      .lt("datum", bis);

    if (error) {
      console.error("[SUPABASE-ERROR]", error.message);
      return NextResponse.json({ error: "Fehler beim Laden der Einträge", details: error.message }, { status: 500 });
    }

    if (!eintraege || eintraege.length === 0) {
      return NextResponse.json({ error: "Keine Einträge gefunden" }, { status: 404 });
    }
    const { data: saetze, error: satzError } = await supabaseAdmin
      .from("vergütungssätze")
      .select("*");

    if (satzError || !saetze) {
      return NextResponse.json({ error: "Fehler beim Laden der Vergütungssätze", details: satzError?.message }, { status: 500 });
    }

    const enriched = eintraege.map((e) => {
      const [h1, m1] = e.beginn.split(":").map(Number);
      const [h2, m2] = e.ende.split(":").map(Number);
      const begMin = h1 * 60 + m1;
      const endMin = h2 * 60 + m2;
      const duration = (endMin - begMin + (endMin < begMin ? 1440 : 0)) / 60;
      const stunden = duration + (e.aufbau ? 0.5 : 0);
      // Nach Datum passenden Satz holen
const passenderSatz = saetze
  .filter((s) => s.funktion === e.funktion && s.gültig_ab <= e.datum)
  .sort((a, b) => b.gültig_ab.localeCompare(a.gültig_ab))[0];

const stundenlohn = passenderSatz?.stundenlohn ?? 0;
const aufbauBonus = passenderSatz?.aufbau_bonus ?? 0;
const betrag = stunden * stundenlohn + (e.aufbau ? aufbauBonus : 0);

      return { ...e, betrag };
    });

    const summe = enriched.reduce((sum, e) => sum + e.betrag, 0);
    console.log("[DEBUG] Summe berechnet:", summe);

    const pdfBuffer = await generateTrainerPDF({
      eintraege: enriched,
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
