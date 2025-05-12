import { Document, Page, Text, StyleSheet } from '@react-pdf/renderer';
import { renderToBuffer } from '@react-pdf/renderer';

interface GeneratePDFProps {
  eintraege: []; // derzeit ignoriert, aber sauber getypt
  trainerName: string;
  monat: string;
  jahr: string;
}

export async function generateTrainerPDF({
  eintraege,
  trainerName,
  monat,
  jahr,
}: GeneratePDFProps): Promise<Buffer> {
  const styles = StyleSheet.create({
    page: { padding: 40, fontSize: 12 },
  });

  const doc = (
    <Document>
      <Page style={styles.page}>
        <Text>Test-PDF für {trainerName} ({monat}/{jahr})</Text>
      </Page>
    </Document>
  );

  return await renderToBuffer(doc);
}
