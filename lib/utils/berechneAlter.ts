export default function berechneAlter(geburtsdatum: string): number {
  const geb = new Date(geburtsdatum)
  const heute = new Date()
  let alter = heute.getFullYear() - geb.getFullYear()
  const m = heute.getMonth() - geb.getMonth()
  if (m < 0 || (m === 0 && heute.getDate() < geb.getDate())) {
    alter--
  }
  return alter
}