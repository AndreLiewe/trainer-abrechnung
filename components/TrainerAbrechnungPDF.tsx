// components/TrainerAbrechnungPDF.tsx
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 14,
  },
  header: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  line: {
    marginTop: 10,
  }
});

const TrainerAbrechnungPDF = () => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>✅ Test PDF erfolgreich</Text>
        <View style={styles.line}>
          <Text>Dies ist ein statischer Test für das PDF-Rendering.</Text>
          <Text>Erstellt mit @react-pdf/renderer.</Text>
        </View>
      </Page>
    </Document>
  );
};

export default TrainerAbrechnungPDF;
