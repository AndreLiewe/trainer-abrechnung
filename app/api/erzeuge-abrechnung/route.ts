import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { generateTrainerPDF } from "@/lib/pdf/generateTrainerPDF";

export const dynamic = "force-dynamic";



function berechneStunden(beginn: string, ende: string, aufbau: boolean): number {
  const [h1, m1] = beginn.split(":").map(Number);
  const [h2, m2] = ende.split(":").map(Number);
  let minuten = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (minuten < 0) minuten += 1440;
  let stunden = minuten / 60;
  if (aufbau) stunden += 0.5;
  return stunden;
}

export async function POST(req: Request) {
  try {
    const { trainername, monat, jahr } = await req.json();

    const von = `${jahr}-${String(monat).padStart(2, "0")}-01`;
    const bis = `${jahr}-${String(monat + 1).padStart(2, "0")}-01`;

    const { data: eintraege, error } = await supabaseAdmin
      .from("abrechnungen")
      .select("datum, sparte, beginn, ende, funktion, aufbau")
      .eq("trainername", trainername)
      .gte("datum", von)
      .lt("datum", bis);

    if (error || !eintraege || eintraege.length === 0) {
      return NextResponse.json({ error: "Keine Einträge gefunden" }, { status: 404 });
    }

    const enriched = eintraege.map((e) => {
      const stunden = berechneStunden(e.beginn, e.ende, e.aufbau);
      const satz = e.funktion === "hilfstrainer" ? 10 : (e.datum >= "2024-04-01" ? 20 : 25);
      return { ...e, betrag: stunden * satz };
    });

    const pdfBuffer = await generateTrainerPDF({
      eintraege: enriched,
      trainerName: trainername,
      monat: String(monat).padStart(2, "0"),
      jahr: String(jahr),
    });

    const filename = `abrechnung-${trainername}-${monat}-${jahr}.pdf`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("pdfs")
      .upload(filename, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: "Upload fehlgeschlagen", details: uploadError.message }, { status: 500 });
    }

    const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/pdfs/${filename}`;
    const summe = enriched.reduce((sum, e) => sum + e.betrag, 0);

    await supabaseAdmin.from("monatsabrechnungen").upsert([{
      trainername,
      monat,
      jahr,
      status: "erstellt",
      pdf_url: publicUrl,
      summe,
      erstell_am: new Date().toISOString(),
    }]);

    return NextResponse.json({ url: publicUrl, summe });
  } catch (err: unknown) {
    console.error("[API-ERROR]", err);
    return NextResponse.json(
      {
        error: "Fehler beim Erstellen der PDF",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
