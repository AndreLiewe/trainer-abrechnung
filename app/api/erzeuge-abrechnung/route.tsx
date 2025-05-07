import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { TrainerAbrechnungPDF } from "../../../components/TrainerAbrechnungPDF";
import { renderToStream } from '@react-pdf/renderer';

export async function POST(req: Request) {
  const { trainername, monat, jahr } = await req.json();

  // 1. Hole Einträge für diesen Trainer + Monat
  const { data: eintraege } = await supabase
    .from('abrechnungen')
    .select('*')
    .eq('trainername', trainername)
    .gte('datum', `${jahr}-${monat.toString().padStart(2, '0')}-01`)
    .lte('datum', `${jahr}-${monat.toString().padStart(2, '0')}-31`);

  if (!eintraege) return NextResponse.json({ error: "Keine Daten" }, { status: 400 });

  // 2. Berechne Summe
  const summe = eintraege.reduce((sum, e) => {
    const [h1, m1] = e.beginn.split(':').map(Number);
    const [h2, m2] = e.ende.split(':').map(Number);
    let min = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (min < 0) min += 1440;
    let stunden = min / 60;
    if (e.aufbau) stunden += 0.5;
    const satz = e.funktion === 'hilfstrainer' ? 10 : 20;
    return sum + stunden * satz;
  }, 0).toFixed(2);

  // 3. PDF generieren als Stream
  const stream = await renderToStream(
    <TrainerAbrechnungPDF
    eintraege={eintraege}
    trainername={trainername}
    monat={monat}
    jahr={jahr}
  />
);
  // 4. Upload in Supabase Storage (Platzhalter, nur falls konfiguriert!)
  const fileName = `abrechnung-${trainername}-${monat}-${jahr}.pdf`;
  const { error } = await supabase.storage
    .from('abrechnungen') // dein Bucket-Name
    .upload(fileName, stream, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (error) return NextResponse.json({ error: "Upload fehlgeschlagen" }, { status: 500 });

  const pdfUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/abrechnungen/${fileName}`;

  // 5. Speichere in Tabelle
  await supabase.from('monatsabrechnungen').insert({
    trainername,
    monat,
    jahr,
    status: 'erstellt',
    summe,
    pdf_url: pdfUrl,
    erstellt_am: new Date().toISOString()
  });

  return NextResponse.json({ success: true, url: pdfUrl });
}
