import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import TagChip from '../components/TagChip'

export default function Giacenze() {
  const [righe, setRighe] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filtroTipologia, setFiltroTipologia] = useState('')
  const [filtroColore, setFiltroColore] = useState('')
  const [filtroGenere, setFiltroGenere] = useState('')
  const [soloScorteBasse, setSoloScorteBasse] = useState(false)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('giacenze').select('*')
    if (error) setError(error.message)
    else setRighe(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const colori = useMemo(() => [...new Set(righe.map(r => r.colore))].sort(), [righe])

  const filtrate = righe.filter(r =>
    (!filtroTipologia || r.tipologia === filtroTipologia) &&
    (!filtroColore || r.colore === filtroColore) &&
    (!filtroGenere || r.genere === filtroGenere) &&
    (!soloScorteBasse || r.giacenza_attuale <= r.soglia_min)
  )

  const totalePezzi = filtrate.reduce((s, r) => s + r.giacenza_attuale, 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Giacenze</h2>
          <p className="sub">Scorta attuale calcolata in tempo reale dai movimenti registrati.</p>
        </div>
        <button className="btn btn-secondary" onClick={load}>Aggiorna</button>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="filter-bar">
        <select value={filtroTipologia} onChange={e => setFiltroTipologia(e.target.value)}>
          <option value="">Tutte le tipologie</option>
          <option>Pantaloni</option>
          <option>Casacca</option>
          <option>Camice</option>
        </select>
        <select value={filtroColore} onChange={e => setFiltroColore(e.target.value)}>
          <option value="">Tutti i colori</option>
          {colori.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={filtroGenere} onChange={e => setFiltroGenere(e.target.value)}>
          <option value="">Tutti i generi</option>
          <option>Uomo</option>
          <option>Donna</option>
          <option>Unisex</option>
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <input type="checkbox" checked={soloScorteBasse} onChange={e => setSoloScorteBasse(e.target.checked)} />
          Solo scorte basse
        </label>
      </div>

      <div className="card">
        <h3>{filtrate.length} articoli — {totalePezzi} pezzi totali in giacenza</h3>
        {loading ? (
          <div className="empty-state">Caricamento…</div>
        ) : filtrate.length === 0 ? (
          <div className="empty-state">Nessun articolo trovato con questi filtri.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Articolo</th>
                <th>Tipologia</th>
                <th>Codice</th>
                <th>Giacenza</th>
                <th>Stato</th>
              </tr>
            </thead>
            <tbody>
              {filtrate.map(r => {
                const basso = r.giacenza_attuale <= r.soglia_min
                return (
                  <tr key={r.articolo_id}>
                    <td><TagChip colore={r.colore} genere={r.genere} taglia={r.taglia} codice={r.codice} /></td>
                    <td>{r.tipologia}</td>
                    <td className="mono" style={{ color: 'var(--graphite)' }}>{r.codice}</td>
                    <td className="mono" style={{ fontWeight: 600 }}>{r.giacenza_attuale}</td>
                    <td><span className={`badge ${basso ? 'low' : 'ok'}`}>{basso ? 'Scorta bassa' : 'OK'}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
