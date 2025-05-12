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
  const page = pdfDoc.addPage([842, 595]); // A4 quer
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 10;
  const margin = 40;
  let y = 545;

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
  const colWidths = [40, 70, 100, 100, 80, 60, 80];
  const cols: number[] = [];
  let xPos = margin;
  for (const w of colWidths) {
    cols.push(xPos);
    xPos += w;
  }

  const rowHeight = 20;
  const startY = y;
  let currentY = y - rowHeight;
page.drawLine({
  start: { x: margin, y: startY },
  end: { x: xPos, y: startY },
  thickness: 0.5,
  color: rgb(0, 0, 0),
});

  const allRows = [headers, ...eintraege.map((e) => [
    getWochentag(e.datum),
    e.datum,
    e.sparte,
    `${e.beginn}–${e.ende}`,
    e.funktion,
    e.aufbau ? "Ja" : "Nein",
    `${e.betrag.toFixed(2)} €`,
  ])];

  for (const row of allRows) {
    row.forEach((cell, i) => {
      const x = cols[i];
      if (typeof x === "number") {
        drawText(String(cell), x + 4, currentY + 5);
      }
    });

    // horizontale Linie
    page.drawLine({
      start: { x: margin, y: currentY },
      end: { x: xPos, y: currentY },
      thickness: 0.5,
      color: rgb(0, 0, 0),
    });

    currentY -= rowHeight;
  }

  // vertikale Linien
  for (let i = 0; i < cols.length; i++) {
    const x = cols[i];
    page.drawLine({
      start: { x, y: currentY + rowHeight },
      end: { x, y: startY },
      thickness: 0.5,
      color: rgb(0, 0, 0),
    });
  }

  // rechte Außenkante
  page.drawLine({
    start: { x: xPos, y: currentY + rowHeight },
    end: { x: xPos, y: startY },
    thickness: 0.5,
    color: rgb(0, 0, 0),
  });

  y = currentY - 20;
  const gesamt = eintraege.reduce((s, e) => s + e.betrag, 0).toFixed(2);
  drawText(`Gesamtsumme: ${gesamt} €`, margin, y, 12);

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
