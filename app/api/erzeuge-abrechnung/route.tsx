import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { TrainerAbrechnungPDF } from "../../../components/TrainerAbrechnungPDF";
import { renderToStream } from '@react-pdf/renderer';

export async function POST(req: Request) {
  try {
    const { trainername, monat, jahr } = await req.json();

    if (!trainername || !monat || !jahr) {
      return NextResponse.json({ error: "Ungültige Eingabedaten." }, { status: 400 });
    }
    const letzterTag = new Date(jahr, monat, 0).getDate(); // z. B. 30 für April
    const startDatum = `${jahr}-${monat.toString().padStart(2, '0')}-01`;
    const endDatum = `${jahr}-${monat.toString().padStart(2, '0')}-${letzterTag}`;
    const { data: eintraege, error: ladeFehler } = await supabase
      .from('abrechnungen')
      .select('*')
      .eq('trainername', trainername)
      .gte('datum', startDatum)
.lte('datum', endDatum);

    if (ladeFehler) throw ladeFehler;

    if (!eintraege || eintraege.length === 0) {
      return NextResponse.json({ error: "Keine Einträge gefunden." }, { status: 400 });
    }

    const summe = eintraege.reduce((sum, e) => {
      const [h1, m1] = e.beginn.split(':').map(Number);
      const [h2, m2] = e.ende.split(':').map(Number);
      let min = (h2 * 60 + m2) - (h1 * 60 + m1);
      if (min < 0) min += 1440;
      let stunden = min / 60;
      if (e.aufbau) stunden += 0.5;
      const satz = e.funktion === 'hilfstrainer' ? 10 : 20;
      return sum + stunden * satz;
    }, 0);

    const stream = await renderToStream(
      <TrainerAbrechnungPDF
        eintraege={eintraege}
        trainername={trainername}
        monat={monat}
        jahr={jahr}
      />
    );

    const fileName = `abrechnung-${trainername}-${monat}-${jahr}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('pdfs')
      .upload(fileName, stream, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const pdfUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/pdfs/${fileName}`;

    const { error: insertError } = await supabase.from('monatsabrechnungen').insert({
      trainername,
      monat,
      jahr,
      status: 'erstellt',
      summe: Number(summe.toFixed(2)),
      pdf_url: pdfUrl,
      erstellt_am: new Date().toISOString(),
    });

    if (insertError) throw insertError;

    return NextResponse.json({ success: true, url: pdfUrl });

  } catch (err) {
    console.error("Fehler in /api/erzeuge-abrechnung:", JSON.stringify(err, null, 2));
    const message =
      err instanceof Error ? err.message : typeof err === "string" ? err : "Unbekannter Fehler";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

