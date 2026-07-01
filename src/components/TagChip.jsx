// Mappa colori nome -> hex per lo swatch visivo. Se il colore non è in mappa,
// viene usato un grigio neutro (funziona comunque con qualsiasi nome di colore).
const COLOR_MAP = {
  blu: '#3B6E8F', bianco: '#F5F5F0', verde: '#4C7A5E', nero: '#1B2430',
  grigio: '#8A8F98', celeste: '#8FB8CF', bordeaux: '#6E2A2A', rosso: '#B03A2E',
  azzurro: '#6FA8C0', giallo: '#D9B23C', arancione: '#C1531F', viola: '#6B4E8E',
  rosa: '#D98CA0', beige: '#D8CBB0', marrone: '#6B4A34', panna: '#EFE7D6',
}

const GENERE_ICON = { Uomo: '♂', Donna: '♀', Unisex: '⚥' }

export default function TagChip({ colore, genere, taglia, codice }) {
  const hex = COLOR_MAP[colore?.toLowerCase()] || '#B8B4A6'
  return (
    <span className="tag-chip" title={codice}>
      <span className="swatch" style={{ background: hex }} />
      {genere && <span>{GENERE_ICON[genere] || ''}</span>}
      <span>{taglia}</span>
    </span>
  )
}
