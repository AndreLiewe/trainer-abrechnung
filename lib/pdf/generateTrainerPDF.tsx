import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { renderToBuffer } from '@react-pdf/renderer';

interface Eintrag {
  datum: string;
  sparte: string;
  dauer: number;
  stundensatz: number;
}

interface PDFProps {
  eintraege: Eintrag[];
  trainerName: string;
  monat: string;
  jahr: string;
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 12 },
  heading: { fontSize: 18, marginBottom: 20 },
  row: { flexDirection: 'row', marginBottom: 4 },
  cell: { flex: 1, borderBottom: '1px solid #ccc' },
  total: { marginTop: 20, fontSize: 14, fontWeight: 'bold' },
});

export function TrainerPDF({ eintraege, trainerName, monat, jahr }: PDFProps) {
  const gesamt = eintraege.reduce((sum, e) => sum + e.dauer * e.stundensatz, 0);

  return (
    <Document>
      <Page style={styles.page}>
        <Text style={styles.heading}>Abrechnung für {trainerName} ({monat}/{jahr})</Text>

        <View>
          {eintraege.map((eintrag, i) => (
            <View style={styles.row} key={i}>
              <Text style={styles.cell}>{eintrag.datum}</Text>
              <Text style={styles.cell}>{eintrag.sparte}</Text>
              <Text style={styles.cell}>{eintrag.dauer} Std</Text>
              <Text style={styles.cell}>{eintrag.stundensatz.toFixed(2)} €</Text>
              <Text style={styles.cell}>{(eintrag.dauer * eintrag.stundensatz).toFixed(2)} €</Text>
            </View>
          ))}
        </View>

        <Text style={styles.total}>Gesamtsumme: {gesamt.toFixed(2)} €</Text>
      </Page>
    </Document>
  );
}

export async function generateTrainerPDF(props: PDFProps): Promise<Buffer> {
  return await renderToBuffer(<TrainerPDF {...props} />);
}