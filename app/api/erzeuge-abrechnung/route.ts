// app/api/erzeuge-abrechnung/route.ts
import { NextResponse } from 'next/server';
import { generateTrainerPDF } from '@/lib/pdf/generateTrainerPDF';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic'; // notwendig für Vercel

interface PDFRequest {
  trainername: string;
  monat: number;
  jahr: number;
}

export async function POST(req: Request) {
  try {
    const body: PDFRequest = await req.json();
    const { trainername, monat, jahr } = body;

    if (!trainername || !monat || !jahr) {
      return NextResponse.json({ error: 'Ungültige Daten' }, { status: 400 });
    }

    // Einträge laden
    const { data: eintraege, error: fetchError } = await supabaseAdmin
      .from('zeit_erfassungen')
      .select('datum, sparte, dauer, stundensatz')
      .eq('trainername', trainername)
      .eq('monat', monat)
      .eq('jahr', jahr);

    if (fetchError || !eintraege || eintraege.length === 0) {
      return NextResponse.json({ error: 'Keine Einträge gefunden' }, { status: 404 });
    }

    // Summe berechnen
    const summe = eintraege.reduce((sum, e) => sum + e.dauer * e.stundensatz, 0);

    // PDF erzeugen
    const buffer = await generateTrainerPDF({
      eintraege,
      trainerName: trainername,
      monat: String(monat).padStart(2, '0'),
      jahr: String(jahr),
    });

    const filename = `abrechnung-${trainername}-${monat}-${jahr}.pdf`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from('pdfs')
      .upload(filename, buffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: 'Upload fehlgeschlagen', details: uploadError.message },
        { status: 500 }
      );
    }

    const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/pdfs/${filename}`;

    // In monatsabrechnungen einfügen
    const { error: insertError } = await supabaseAdmin
      .from('monatsabrechnungen')
      .insert([
        {
          trainername,
          monat,
          jahr,
          status: 'erstellt',
          pdf_url: publicUrl,
          summe,
          erstell_am: new Date().toISOString(),
        },
      ]);

    if (insertError) {
      return NextResponse.json(
        { error: 'Speichern in Datenbank fehlgeschlagen', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: publicUrl, summe });
  } catch (err: unknown) {
    if (err instanceof Error) {
      return NextResponse.json({ error: 'Serverfehler', details: err.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Unbekannter Fehler' }, { status: 500 });
  }
}
