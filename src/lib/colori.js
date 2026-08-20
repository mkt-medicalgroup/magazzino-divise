// Palette dei colori reali delle divise, presi direttamente dai capi
// fotografati (campionati dai pixel reali della foto fornita dal
// fornitore) — massima fedeltà. Il campo "codice" è il codice colore
// usato dal fornitore.
export const PALETTE_COLORI = [
  { nome: 'Black',          hex: '#2A2A2A', codice: '1' },
  { nome: 'Navy',           hex: '#242B49', codice: '10' },
  { nome: 'White',          hex: '#EEEDF0', codice: '3' },
  { nome: 'Aubergine',      hex: '#5D2835', codice: '39' },
  { nome: 'Sage',           hex: '#8B8578', codice: '67' },
  { nome: 'Platinum grey',  hex: '#8D8C90', codice: '68' },
  { nome: 'Fuchsia',        hex: '#972B59', codice: '70' },
  { nome: 'Emerald green',  hex: '#2EA290', codice: '72' },
  { nome: 'Kiwi',           hex: '#B6E374', codice: '73' },
  { nome: 'Pacific blue',   hex: '#1FAAD1', codice: '74' },
  { nome: 'Royal blue',     hex: '#276CBE', codice: '76' },
]

// Ricava il colore esatto da mostrare: usa l'hex salvato sull'articolo se
// presente, altrimenti cerca il nome nella palette, altrimenti grigio neutro.
export function risolviColoreHex(nomeColore, hexSalvato) {
  if (hexSalvato) return hexSalvato
  const trovato = PALETTE_COLORI.find(c => c.nome.toLowerCase() === (nomeColore || '').toLowerCase())
  return trovato ? trovato.hex : '#B8B4A6'
}
