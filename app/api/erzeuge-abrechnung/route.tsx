// app/api/erzeuge-abrechnung/route.tsx
import { NextResponse } from 'next/server';
import TrainerAbrechnungPDF from '@/components/TrainerAbrechnungPDF';
import { renderToStream } from '@react-pdf/renderer';
import { supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const fileName = `test-abrechnung.pdf`;

    const stream = await renderToStream(<TrainerAbrechnungPDF />);

    const { error } = await supabase.storage
      .from('pdfs') // 🔁 Passe den Bucket-Namen ggf. an
      .upload(fileName, stream, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (error) throw error;

    const pdfUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/pdfs/${fileName}`;
    return NextResponse.json({ success: true, url: pdfUrl });
  } catch (err) {
    console.error('❌ Fehler bei PDF-Test:', err);
    return NextResponse.json({ error: 'Fehler beim PDF-Test' }, { status: 500 });
  }
}
