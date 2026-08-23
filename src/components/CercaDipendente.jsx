import { useEffect, useRef, useState } from 'react'

// Campo di ricerca dipendente: digitando il nome, propone i risultati
// corrispondenti da scegliere con un clic, invece di un lungo menu a tendina.
export default function CercaDipendente({ dipendenti, valore, onScegli, placeholder }) {
  const [testo, setTesto] = useState('')
  const [aperto, setAperto] = useState(false)
  const chiudiTimeout = useRef(null)

  // Se il dipendente selezionato cambia dall'esterno (es. reset del form),
  // aggiorna il testo mostrato di conseguenza.
  useEffect(() => {
    if (!valore) { setTesto(''); return }
    const d = dipendenti.find(d => d.id === valore)
    if (d) setTesto(`${d.cognome} ${d.nome}`)
  }, [valore, dipendenti])

  const risultati = testo.trim()
    ? dipendenti.filter(d => `${d.cognome} ${d.nome}`.toLowerCase().includes(testo.trim().toLowerCase())).slice(0, 30)
    : dipendenti.slice(0, 30)

  function scegli(d) {
    onScegli(d.id)
    setTesto(`${d.cognome} ${d.nome}`)
    setAperto(false)
  }

  function handleChange(e) {
    setTesto(e.target.value)
    if (valore) onScegli('') // il testo non corrisponde più alla selezione precedente
    setAperto(true)
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        value={testo}
        placeholder={placeholder || 'Cerca per cognome o nome…'}
        onChange={handleChange}
        onFocus={() => setAperto(true)}
        onBlur={() => { chiudiTimeout.current = setTimeout(() => setAperto(false), 150) }}
        autoComplete="off"
      />
      {aperto && risultati.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
          background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 6,
          marginTop: 4, maxHeight: 220, overflowY: 'auto', boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
        }}>
          {risultati.map(d => (
            <div
              key={d.id}
              onMouseDown={() => { clearTimeout(chiudiTimeout.current); scegli(d) }}
              style={{ padding: '9px 12px', cursor: 'pointer', fontSize: 14, borderBottom: '1px solid #F0EEE7' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--canvas)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {d.cognome} {d.nome}
              {d.sedi?.nome && <span style={{ color: 'var(--graphite)', fontSize: 12 }}> — {d.sedi.nome}</span>}
            </div>
          ))}
        </div>
      )}
      {aperto && testo.trim() && risultati.length === 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
          background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 6,
          marginTop: 4, padding: '9px 12px', fontSize: 13, color: 'var(--graphite)',
        }}>
          Nessun dipendente trovato.
        </div>
      )}
    </div>
  )
}
