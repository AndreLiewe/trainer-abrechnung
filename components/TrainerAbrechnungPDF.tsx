import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
type AbrechnungsEintrag = {
    datum: string;
    sparte: string;
    beginn: string;
    ende: string;
    funktion: string;
    aufbau: boolean;
  };
  
const styles = StyleSheet.create({
  page: { padding: 20, fontSize: 12 },
  header: { fontSize: 16, marginBottom: 10 },
  row: { flexDirection: 'row', marginBottom: 5 },
  col: { width: '20%' },
  bold: { fontWeight: 'bold' },
});

const TrainerAbrechnungPDF = ({
  eintraege,
  trainername,
  monat,
  jahr,
}: {
    eintraege: AbrechnungsEintrag[];
  trainername: string;
  monat: number;
  jahr: number;
}) => {
  const gesamt = eintraege.reduce((sum, e) => {
    const [h1, m1] = e.beginn.split(":").map(Number);
    const [h2, m2] = e.ende.split(":").map(Number);
    let minuten = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (minuten < 0) minuten += 1440;
    let stunden = minuten / 60;
    if (e.aufbau) stunden += 0.5;
    const satz = e.funktion === "hilfstrainer" ? 10 : 20;
    return sum + stunden * satz;
  }, 0).toFixed(2);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>Monatsabrechnung für {trainername} ({monat}/{jahr})</Text>
        {eintraege.map((e, i) => (
          <View key={i} style={styles.row}>
            <Text style={styles.col}>{e.datum}</Text>
            <Text style={styles.col}>{e.sparte}</Text>
            <Text style={styles.col}>{e.beginn}-{e.ende}</Text>
            <Text style={styles.col}>{e.funktion}</Text>
            <Text style={styles.col}>{e.aufbau ? "Ja" : "Nein"}</Text>
          </View>
        ))}
        <Text style={{ marginTop: 20 }}>Gesamtsumme: {gesamt} €</Text>
      </Page>
    </Document>
  );
};

export { TrainerAbrechnungPDF };
