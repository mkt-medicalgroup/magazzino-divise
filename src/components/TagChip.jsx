import { risolviColoreHex } from '../lib/colori'

const GENERE_ICON = { Uomo: '♂', Donna: '♀', Unisex: '⚥' }

export default function TagChip({ colore, coloreHex, genere, taglia, codice }) {
  const hex = risolviColoreHex(colore, coloreHex)
  return (
    <span className="tag-chip" title={codice}>
      <span className="swatch" style={{ background: hex }} />
      {genere && <span>{GENERE_ICON[genere] || ''}</span>}
      <span>{taglia}</span>
    </span>
  )
}
