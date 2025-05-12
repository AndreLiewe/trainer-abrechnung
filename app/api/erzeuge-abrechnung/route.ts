import { NextResponse } from 'next/server';
import { generateTrainerPDF } from '@/lib/pdf/generateTrainerPDF';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    const { data: eintraege, error: fetchError } = await supabase
      .from('zeit_erfassungen')
      .select('datum, sparte, dauer, stundensatz')
      .eq('trainername', trainername)
      .eq('monat', monat)
      .eq('jahr', jahr);

    if (fetchError || !eintraege || eintraege.length === 0) {
      return NextResponse.json({ error: 'Keine Einträge gefunden' }, { status: 404 });
    }

    const buffer = await generateTrainerPDF({
      eintraege,
      trainerName: trainername,
      monat: String(monat).padStart(2, '0'),
      jahr: String(jahr),
    });

    const filename = `abrechnung-${trainername}-${monat}-${jahr}.pdf`;
    const { error: uploadError } = await supabase.storage.from('pdfs').upload(filename, buffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

    if (uploadError) {
      return NextResponse.json({ error: 'Upload fehlgeschlagen', details: uploadError.message }, { status: 500 });
    }

    const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/pdfs/${filename}`;

    return NextResponse.json({ url: publicUrl });
  } catch (err: unknown) {
    if (err instanceof Error) {
      return NextResponse.json({ error: 'Serverfehler', details: err.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Unbekannter Fehler' }, { status: 500 });
  }
}