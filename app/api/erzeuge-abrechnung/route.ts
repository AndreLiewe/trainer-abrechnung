import { NextResponse } from 'next/server';
import { generateTrainerPDF } from '@/lib/pdf/generateTrainerPDF';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Wichtig: Service Role Key für Upload
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { eintraege, trainerName, monat, jahr } = body;

    if (!eintraege || !trainerName || !monat || !jahr) {
      return NextResponse.json({ error: 'Ungültige Daten' }, { status: 400 });
    }

    const buffer = await generateTrainerPDF({ eintraege, trainerName, monat, jahr });

    const filename = `abrechnung-${trainerName}-${monat}-${jahr}.pdf`;
    const { error } = await supabase.storage.from('pdfs').upload(filename, buffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

    if (error) {
      return NextResponse.json({ error: 'Upload fehlgeschlagen', details: error.message }, { status: 500 });
    }

    const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/pdfs/${filename}`;

    return NextResponse.json({ url: publicUrl });
  } catch (err: any) {
    return NextResponse.json({ error: 'Serverfehler', details: err.message }, { status: 500 });
  }
}
