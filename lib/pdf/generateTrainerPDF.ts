import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

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

function getWochentag(datumStr: string) {
  const tage = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
  return tage[new Date(datumStr).getDay()];
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
  const fontSize = 11;
  const { height } = page.getSize();
  const margin = 40;
  let y = height - margin;

  const drawText = (text: string, x: number, y: number, size = fontSize) => {
    page.drawText(text, { x, y, size, font, color: rgb(0, 0, 0) });
  };

  drawText("Abrechnung Aufwandsentschädigung", margin, y, 14);
  y -= 18;
  drawText("Bushido Sportverein Wahrsow e.V.", margin, y, 14);
  y -= 25;

  drawText(`Trainer: ${trainerName}`, margin, y);
  y -= 15;
  drawText(`Monat: ${monat} / ${jahr}`, margin, y);
  y -= 25;

  const headers = ["Tag", "Datum", "Sparte", "Zeit", "Funktion", "Aufbau", "Betrag"];
  const cols = [margin, margin + 35, margin + 90, margin + 180, margin + 260, margin + 340, margin + 420];
  const rowHeight = 16;

  // Header
  for (let i = 0; i < headers.length; i++) {
    drawText(headers[i], cols[i], y, fontSize);
  }
  y -= rowHeight;

  let summe = 0;

  for (const e of eintraege) {
    const tag = getWochentag(e.datum);
    drawText(tag, cols[0], y);
    drawText(e.datum, cols[1], y);
    drawText(e.sparte, cols[2], y);
    drawText(`${e.beginn}–${e.ende}`, cols[3], y);
    drawText(e.funktion, cols[4], y);
    drawText(e.aufbau ? "Ja" : "Nein", cols[5], y);
    drawText(`${e.betrag.toFixed(2)} €`, cols[6], y);
    y -= rowHeight;
    summe += e.betrag;

    if (y < 60) break;
  }

  y -= 10;
  drawText(`Gesamtsumme: ${summe.toFixed(2)} €`, margin, y, 12);

  // Rahmen (nur grob außen, kein Zellraster)
  const tableTop = height - margin - 100;
  const tableBottom = y + 5;
  page.drawRectangle({
    x: margin - 5,
    y: tableBottom,
    width: 500,
    height: tableTop - tableBottom,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
