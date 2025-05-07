// components/TrainerAbrechnungPDF.tsx
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font
} from '@react-pdf/renderer';

type AbrechnungsEintrag = {
  datum: string;
  sparte: string;
  beginn: string;
  ende: string;
  funktion: string;
  aufbau: boolean;
};

// Optional: Schriftart registrieren (nur nötig bei Custom-Fonts)
// Font.register({ family: 'Roboto', src: 'https://...' });

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 11,
    fontFamily: 'Helvetica',
  },
  header: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  tableHeader: {
    fontWeight: 'bold',
    marginBottom: 8,
    flexDirection: 'row',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  col: {
    width: '20%',
  },
  footer: {
    marginTop: 30,
    textAlign: 'right',
  },
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
    const [h1, m1] = e.beginn.split(':').map(Number);
    const [h2, m2] = e.ende.split(':').map(Number);
    let minuten = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (minuten < 0) minuten += 1440;
    let stunden = minuten / 60;
    if (e.aufbau) stunden += 0.5;
    const satz = e.funktion === 'hilfstrainer' ? 10 : 20;
    return sum + stunden * satz;
  }, 0).toFixed(2);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>
          Abrechnung Aufwandsentschädigung
          {'\n'}
          Bushido Sportverein Wahrsow e.V.
        </Text>

        <Text style={{ marginBottom: 10 }}>
          Trainer: {trainername} | Monat: {monat}/{jahr}
        </Text>

        <View style={styles.tableHeader}>
          <Text style={styles.col}>Datum</Text>
          <Text style={styles.col}>Sparte</Text>
          <Text style={styles.col}>Zeit</Text>
          <Text style={styles.col}>Funktion</Text>
          <Text style={styles.col}>Aufbau</Text>
        </View>

        {eintraege.map((e, i) => (
          <View style={styles.row} key={i}>
            <Text style={styles.col}>{e.datum}</Text>
            <Text style={styles.col}>{e.sparte}</Text>
            <Text style={styles.col}>{e.beginn}–{e.ende}</Text>
            <Text style={styles.col}>{e.funktion}</Text>
            <Text style={styles.col}>{e.aufbau ? 'Ja' : 'Nein'}</Text>
          </View>
        ))}

        <Text style={styles.footer}>Gesamtsumme: {gesamt} €</Text>
      </Page>
    </Document>
  );
};

export default TrainerAbrechnungPDF;

