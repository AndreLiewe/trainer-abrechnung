import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { TrainerAbrechnungPDF } from "../../../components/TrainerAbrechnungPDF";
import { renderToStream } from '@react-pdf/renderer';

export async function POST(req: Request) {
  const { trainername, monat, jahr } = await req.json();

  // 🔐 1. Validierung der Eingabe
  if (!trainername || !monat || !jahr) {
    return NextResponse.json({ error: "Ungültige Eingabedaten." }, { status: 400 });
  }

  // 📦 2. Hole Einträge für diesen Trainer im Monat
  const { data: eintraege, error: ladeFehler } = await supabase
    .from('abrechnungen')
    .select('*')
    .eq('trainername', trainername)
    .gte('datum', `${jahr}-${monat.toString().padStart(2, '0')}-01`)
    .lte('datum', `${jahr}-${monat.toString().padStart(2, '0')}-31`);

  if (ladeFehler) {
    return NextResponse.json({ error: "Fehler beim Laden der Einträge." }, { status: 500 });
  }

  if (!eintraege || eintraege.length === 0) {
    return NextResponse.json({ error: "Keine Einträge gefunden." }, { status: 400 });
  }

  // 💰 3. Summe berechnen
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

  // 🧾 4. PDF als Stream generieren
  const stream = await renderToStream(
    <TrainerAbrechnungPDF
      eintraege={eintraege}
      trainername={trainername}
      monat={monat}
      jahr={jahr}
    />
  );

  // 📤 5. Upload in Supabase Storage
  const fileName = `abrechnung-${trainername}-${monat}-${jahr}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from('pdfs') // ✅ Bucket muss "pdfs" heißen!
    .upload(fileName, stream, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json({ error: "Upload fehlgeschlagen." }, { status: 500 });
  }

  const pdfUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/pdfs/${fileName}`;

  // 💾 6. Speichere Abrechnungsdatensatz
  const { error: insertError } = await supabase.from('monatsabrechnungen').insert({
    trainername,
    monat,
    jahr,
    status: 'erstellt',
    summe: Number(summe.toFixed(2)),
    pdf_url: pdfUrl,
    erstellt_am: new Date().toISOString(),
  });

  if (insertError) {
    return NextResponse.json({ error: "Fehler beim Speichern der Abrechnung." }, { status: 500 });
  }

  return NextResponse.json({ success: true, url: pdfUrl });
}
