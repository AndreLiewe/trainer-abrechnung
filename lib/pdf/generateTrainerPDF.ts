// lib/pdf/generateTrainerPDF.ts
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

interface AbrechnungsEintrag {
  datum: string;
  sparte: string;
  beginn: string;
  ende: string;
  funktion: string;
  aufbau: boolean;
  betrag: number;
}

interface PDFProps {
  eintraege: AbrechnungsEintrag[];
  trainerName: string;
  monat: string;
  jahr: string;
}

export async function generateTrainerPDF({
  eintraege,
  trainerName,
  monat,
  jahr,
}: PDFProps): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const height = page.getSize().height;
  const margin = 50;
  let y = height - margin;

  const drawText = (text: string, x: number, y: number, size = 12) => {
    page.drawText(text, { x, y, size, font, color: rgb(0, 0, 0) });
  };

  drawText(`Abrechnung für ${trainerName} (${monat}/${jahr})`, margin, y, 16);
  y -= 30;

  drawText(`Datum`, margin + 0, y);
  drawText(`Sparte`, margin + 80, y);
  drawText(`Zeit`, margin + 180, y);
  drawText(`Funktion`, margin + 280, y);
  drawText(`Aufbau`, margin + 380, y);
  drawText(`Betrag`, margin + 460, y);
  y -= 20;

  let summe = 0;
  for (const eintrag of eintraege) {
    const zeile = [
      eintrag.datum,
      eintrag.sparte,
      `${eintrag.beginn}–${eintrag.ende}`,
      eintrag.funktion,
      eintrag.aufbau ? 'Ja' : 'Nein',
      `${eintrag.betrag.toFixed(2)} €`,
    ];

    drawText(zeile[0], margin + 0, y);
    drawText(zeile[1], margin + 80, y);
    drawText(zeile[2], margin + 180, y);
    drawText(zeile[3], margin + 280, y);
    drawText(zeile[4], margin + 380, y);
    drawText(zeile[5], margin + 460, y);
    y -= 18;

    summe += eintrag.betrag;
    if (y < 80) break; // keine Seitenumbrüche – für ersten Test reicht das
  }

  y -= 10;
  drawText(`Gesamtsumme: ${summe.toFixed(2)} €`, margin, y, 14);

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
