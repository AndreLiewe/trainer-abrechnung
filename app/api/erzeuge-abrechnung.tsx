import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabaseClient';
import TrainerAbrechnungPDF from '@/components/TrainerAbrechnungPDF';
import { renderToBuffer } from '@react-pdf/renderer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { trainername, monat, jahr } = req.body;

    if (!trainername || !monat || !jahr) {
      return res.status(400).json({ error: 'Fehlende Parameter' });
    }

    const letzterTag = new Date(jahr, monat, 0).getDate();
    const startDatum = `${jahr}-${monat.toString().padStart(2, '0')}-01`;
    const endDatum = `${jahr}-${monat.toString().padStart(2, '0')}-${letzterTag}`;

    const { data: eintraege, error } = await supabase
      .from('abrechnungen')
      .select('*')
      .eq('trainername', trainername)
      .gte('datum', startDatum)
      .lte('datum', endDatum);

    if (error || !eintraege || eintraege.length === 0) {
      return res.status(404).json({ error: 'Keine Einträge gefunden' });
    }

    // PDF erzeugen als Buffer
    const pdfBuffer = await renderToBuffer(
      <TrainerAbrechnungPDF
        eintraege={eintraege}
        trainername={trainername}
        monat={monat}
        jahr={jahr}
      />
    );

    const fileName = `abrechnung-${trainername}-${monat}-${jahr}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('pdfs') // ← passe deinen Bucket-Namen ggf. an
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      return res.status(500).json({ error: 'Upload fehlgeschlagen', details: uploadError });
    }

    const pdfUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/pdfs/${fileName}`;

    await supabase.from('monatsabrechnungen').insert({
      trainername,
      monat,
      jahr,
      status: 'erstellt',
      summe: 0, // Optional: kannst du auch berechnen
      pdf_url: pdfUrl,
      erstellt_am: new Date().toISOString(),
    });

    return res.status(200).json({ success: true, url: pdfUrl });
  } catch (err: unknown) {
    console.error('Fehler bei PDF-Erzeugung:', err);
  
    if (err instanceof Error) {
      return res.status(500).json({ error: err.message });
    }
  
    return res.status(500).json({ error: 'Unbekannter Fehler' });
  }
}
