import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { renderToBuffer } from '@react-pdf/renderer';
console.log('[PDF] Starte PDF-Erzeugung...');


interface AbrechnungsEintrag {
  datum: string;
  sparte: string;
  beginn: string;
  ende: string;
  funktion: string;
  aufbau: boolean;
  betrag: number;
}

export async function generateTrainerPDF({
  eintraege,
  trainerName,
  monat,
  jahr,
}: {
  eintraege: AbrechnungsEintrag[];
  trainerName: string;
  monat: string;
  jahr: string;
}): Promise<Buffer> {

  const styles = StyleSheet.create({
    page: { padding: 40, fontSize: 12 },
    heading: { fontSize: 18, marginBottom: 20 },
    row: { flexDirection: 'row', marginBottom: 4 },
    cell: { flex: 1, borderBottom: '1px solid #ccc' },
    total: { marginTop: 20, fontSize: 14, fontWeight: 'bold' },
  });

  const gesamt = eintraege.reduce((sum, e) => sum + e.betrag, 0);

  const TrainerPDF = (
    <Document>
      <Page style={styles.page}>
        <Text style={styles.heading}>Abrechnung für {trainerName} ({monat}/{jahr})</Text>
        <View>
          {eintraege.map((e, i) => (
            <View style={styles.row} key={i}>
              <Text style={styles.cell}>{e.datum}</Text>
              <Text style={styles.cell}>{e.sparte}</Text>
              <Text style={styles.cell}>{e.beginn}-{e.ende}</Text>
              <Text style={styles.cell}>{e.funktion}</Text>
              <Text style={styles.cell}>{e.aufbau ? 'Ja' : 'Nein'}</Text>
              <Text style={styles.cell}>{e.betrag.toFixed(2)} €</Text>
            </View>
          ))}
        </View>
        <Text style={styles.total}>Gesamtsumme: {gesamt.toFixed(2)} €</Text>
      </Page>
    </Document>
  );
console.log('[PDF] Daten für PDF:', JSON.stringify(eintraege, null, 2));
console.log('[PDF] Monat/Jahr:', monat, jahr);

 try {
  return await renderToBuffer(TrainerPDF);
} catch (err) {
  console.error('[PDF] Fehler beim rendern:', err);
  throw new Error('PDF konnte nicht erzeugt werden.');
}}

