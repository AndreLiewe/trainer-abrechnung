import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

interface AbrechnungsEintrag {
  datum: string;
  sparte: string;
  beginn: string;
  ende: string;
  funktion: string;
  aufbau: boolean;
  betrag: number;
  typ: "normal" | "nachtrag" | "korrektur-alt" | "korrektur-neu";
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
  const page = pdfDoc.addPage([842, 595]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 10;
  const margin = 40;
  let y = 545;

  const drawText = (text: string, x: number, y: number, size = fontSize, color = rgb(0, 0, 0)) => {
    page.drawText(text, { x, y, size, font, color });
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
  const colWidths = [40, 70, 130, 120, 70, 60, 70];
  const cols: number[] = [];
  let xPos = margin;
  for (const w of colWidths) {
    cols.push(xPos);
    xPos += w;
  }

  const rowHeight = 20;
  const drawRow = (row: string[], yPos: number, strike = false) => {
    row.forEach((cell, i) => {
      const x = cols[i];
      drawText(cell, x + 4, yPos + 5);
      if (strike) {
        const width = font.widthOfTextAtSize(cell, fontSize);
        page.drawLine({
          start: { x: x + 4, y: yPos + 10 },
          end: { x: x + 4 + width, y: yPos + 10 },
          thickness: 0.5,
          color: rgb(1, 0, 0),
        });
      }
    });

    page.drawLine({
      start: { x: margin, y: yPos },
      end: { x: xPos, y: yPos },
      thickness: 0.5,
      color: rgb(0, 0, 0),
    });
  };

  const drawSection = (title: string, list: AbrechnungsEintrag[]) => {
    drawText(title, margin, y);
    y -= rowHeight;
    drawRow(headers, y);
    y -= rowHeight;

    let sum = 0;
    for (const e of list) {
      const row = [
        getWochentag(e.datum),
        e.datum,
        e.sparte,
        `${e.beginn}–${e.ende}`,
        e.funktion,
        e.aufbau ? "Ja" : "Nein",
        `${e.betrag.toFixed(2)} €`,
      ];
      const isStrike = e.typ === "korrektur-alt";
      drawRow(row, y, isStrike);
      sum += e.betrag;
      y -= rowHeight;
    }

    drawText(`Teilsumme: ${sum.toFixed(2)} €`, margin, y);
    y -= rowHeight;
    return sum;
  };

  const normal = eintraege.filter((e) => e.typ === "normal");
  const nachtrag = eintraege.filter((e) => e.typ === "nachtrag");
  const korrekturenAlt = eintraege.filter((e) => e.typ === "korrektur-alt");
  const korrekturenNeu = eintraege.filter((e) => e.typ === "korrektur-neu");

  const sumNormal = drawSection("Normale Einträge", normal);
  const sumNachtrag = drawSection("Nachträge", nachtrag);
  const sumKorr = drawSection("Korrekturen (alt)", korrekturenAlt);
  const sumKorrNeu = drawSection("Korrekturen (neu)", korrekturenNeu);

  y -= 10;
  const total = sumNormal + sumNachtrag + sumKorr + sumKorrNeu;
  drawText(`Gesamtsumme: ${total.toFixed(2)} €`, margin, y, 12);

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
