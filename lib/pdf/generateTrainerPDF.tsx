import { Document, Page, Text, StyleSheet } from '@react-pdf/renderer';
import { renderToBuffer } from '@react-pdf/renderer';

export async function generateTrainerPDF({
  trainerName,
  monat,
  jahr,
}: {
  eintraege: any[];
  trainerName: string;
  monat: string;
  jahr: string;
}): Promise<Buffer> {
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
