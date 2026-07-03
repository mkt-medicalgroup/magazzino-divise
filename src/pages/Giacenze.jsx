import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'

const COLOR_MAP = {
  blu: '#3B6E8F', bianco: '#F5F5F0', verde: '#4C7A5E', nero: '#1B2430',
  grigio: '#8A8F98', celeste: '#8FB8CF', bordeaux: '#6E2A2A', rosso: '#B03A2E',
  azzurro: '#6FA8C0', giallo: '#D9B23C', arancione: '#C1531F', viola: '#6B4E8E',
  rosa: '#D98CA0', beige: '#D8CBB0', marrone: '#6B4A34', panna: '#EFE7D6',
}

export default function Giacenze() {
  const [righe, setRighe] = useState([])       // formato lungo: articolo x azienda
  const [aziende, setAziende] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filtroTipologia, setFiltroTipologia] = useState('')
  const [filtroColore, setFiltroColore] = useState('')
  const [filtroGenere, setFiltroGenere] = useState('')
  const [soloScorteBasse, setSoloScorteBasse] = useState(false)

  async function load() {
    setLoading(true)
    const [{ data: g, error: gErr }, { data: az }] = await Promise.all([
      supabase.from('giacenze').select('*'),
      supabase.from('aziende').select('*').order('nome'),
    ])
    if (gErr) setError(gErr.message)
    setRighe(g || [])
    setAziende(az || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const colori = useMemo(() => [...new Set(righe.map(r => r.colore))].sort(), [righe])

  // Applica i filtri comuni (tipologia/colore/genere) a tutte le righe
  const righeFiltrate = righe.filter(r =>
    (!filtroTipologia || r.tipologia === filtroTipologia) &&
    (!filtroColore || r.colore === filtroColore) &&
    (!filtroGenere || r.genere === filtroGenere)
  )

  const totaleGenerale = righeFiltrate.reduce((s, r) => s + r.giacenza_attuale, 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Giacenze</h2>
          <p className="sub">Scorta attuale per società: carichi meno scarichi meno le divise assegnate ai dipendenti (non rese).</p>
        </div>
        <button className="btn btn-secondary" onClick={load}>Aggiorna</button>
      </div>

      {error && <div className="alert error">{error}</div>}

      {aziende.length === 0 && !loading && (
        <div className="alert error">Nessuna società trovata. Verifica di aver eseguito tutti gli script di migrazione su Supabase.</div>
      )}

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
        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--graphite)', alignSelf: 'center' }}>
          Totale generale: <strong className="mono" style={{ color: 'var(--text)' }}>{totaleGenerale}</strong> pezzi
        </span>
      </div>

      {loading ? (
        <div className="card"><div className="empty-state">Caricamento…</div></div>
      ) : (
        aziende.map(az => {
          const righeAzienda = righeFiltrate
            .filter(r => r.azienda_id === az.id)
            .filter(r => !soloScorteBasse || r.giacenza_attuale <= r.soglia_min)

          const totaleAzienda = righeFiltrate
            .filter(r => r.azienda_id === az.id)
            .reduce((s, r) => s + r.giacenza_attuale, 0)

          return (
            <div className="card" key={az.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                <h3 style={{ margin: 0 }}>{az.nome}</h3>
                <span className="mono" style={{ fontSize: 18, fontWeight: 600 }}>{totaleAzienda} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--graphite)' }}>pezzi totali</span></span>
              </div>

              {righeAzienda.length === 0 ? (
                <div className="empty-state">Nessun articolo trovato con questi filtri per questa società.</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Articolo</th>
                      <th>Taglia</th>
                      <th style={{ textAlign: 'right' }}>Q.tà in giacenza</th>
                      <th>Stato</th>
                    </tr>
                  </thead>
                  <tbody>
                    {righeAzienda.map(r => {
                      const basso = r.giacenza_attuale <= r.soglia_min
                      const hex = COLOR_MAP[r.colore?.toLowerCase()] || '#B8B4A6'
                      return (
                        <tr key={r.articolo_id}>
                          <td>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                              <span className="swatch" style={{ background: hex }} />
                              {r.tipologia} {r.colore} <span style={{ color: 'var(--graphite)', fontSize: 12.5 }}>({r.genere})</span>
                            </span>
                          </td>
                          <td className="mono">{r.taglia}</td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>{r.giacenza_attuale}</td>
                          <td><span className={`badge ${basso ? 'low' : 'ok'}`}>{basso ? 'Scorta bassa' : 'OK'}</span></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
