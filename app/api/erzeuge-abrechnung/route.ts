import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { generateTrainerPDF } from '@/lib/generateTrainerPDF';

export async function POST(req: Request) {
  try {
    const { trainername, monat, jahr } = await req.json();

    if (!trainername || !monat || !jahr) {
      return NextResponse.json({ error: 'Fehlende Parameter' }, { status: 400 });
    }

    const letzterTag = new Date(jahr, monat, 0).getDate();
    const startDatum = `${jahr}-${String(monat).padStart(2, '0')}-01`;
    const endDatum = `${jahr}-${String(monat).padStart(2, '0')}-${letzterTag}`;

    const { data: eintraege, error } = await supabase
      .from('abrechnungen')
      .select('*')
      .eq('trainername', trainername)
      .gte('datum', startDatum)
      .lte('datum', endDatum);

    if (error || !eintraege || eintraege.length === 0) {
      return NextResponse.json({ error: 'Keine Einträge gefunden' }, { status: 404 });
    }

    const pdfBuffer = await generateTrainerPDF({ eintraege, trainername, monat, jahr });

    const fileName = `abrechnung-${trainername}-${monat}-${jahr}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from('pdfs')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: 'Upload fehlgeschlagen', details: uploadError.message }, { status: 500 });
    }

    const pdfUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/pdfs/${fileName}`;

    await supabase.from('monatsabrechnungen').insert({
      trainername,
      monat,
      jahr,
      status: 'erstellt',
      summe: 0,
      pdf_url: pdfUrl,
      erstellt_am: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, url: pdfUrl });
  } catch (err) {
    console.error('Fehler bei PDF-Erzeugung:', err);
    return NextResponse.json({ error: 'Unbekannter Fehler' }, { status: 500 });
  }
}
