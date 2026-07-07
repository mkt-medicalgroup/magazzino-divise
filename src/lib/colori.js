// Palette di colori comuni per le divise, con codice esadecimale preciso.
// Usata dal selettore nel catalogo (Articoli) e da TagChip per mostrare
// uno swatch visivamente fedele al colore reale in tutta l'app.
//
// I colori con "codice" sono presi direttamente dai capi fotografati
// (campionati dai pixel reali della foto fornita) — massima fedeltà.
// Gli altri sono valori generici di riserva.
export const PALETTE_COLORI = [
  // --- Colori reali dei capi (dalla foto fornita) ---
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

  // --- Colori generici di riserva (nessun capo fotografato ancora) ---
  { nome: 'Blu navy',        hex: '#16243B' },
  { nome: 'Celeste',         hex: '#8FB8CF' },
  { nome: 'Azzurro',         hex: '#5B9BD5' },
  { nome: 'Verde scuro',     hex: '#2F5233' },
  { nome: 'Verde acqua',     hex: '#4FB8A6' },
  { nome: 'Grigio scuro',    hex: '#4A4E54' },
  { nome: 'Bordeaux',        hex: '#6E2A2A' },
  { nome: 'Rosa',            hex: '#E8A0B4' },
  { nome: 'Rosa antico',     hex: '#C98A9C' },
  { nome: 'Viola',           hex: '#6B4E8E' },
  { nome: 'Lilla',           hex: '#B49AC9' },
  { nome: 'Giallo',          hex: '#E8C547' },
  { nome: 'Senape',          hex: '#C9A227' },
  { nome: 'Arancione',       hex: '#D2691E' },
  { nome: 'Beige',           hex: '#D8CBB0' },
  { nome: 'Panna',           hex: '#EFE7D6' },
  { nome: 'Marrone',         hex: '#6B4A34' },
  { nome: 'Tortora',         hex: '#A99C8B' },
]

// Ricava il colore esatto da mostrare: usa l'hex salvato sull'articolo se
// presente, altrimenti cerca il nome nella palette, altrimenti grigio neutro.
export function risolviColoreHex(nomeColore, hexSalvato) {
  if (hexSalvato) return hexSalvato
  const trovato = PALETTE_COLORI.find(c => c.nome.toLowerCase() === (nomeColore || '').toLowerCase())
  return trovato ? trovato.hex : '#B8B4A6'
}
