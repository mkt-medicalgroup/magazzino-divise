import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import TagChip from '../components/TagChip'

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

  // Pivot: raggruppa le righe per articolo, con una colonna di giacenza per ogni azienda
  const pivot = useMemo(() => {
    const mappa = new Map()
    for (const r of righe) {
      if (!mappa.has(r.articolo_id)) {
        mappa.set(r.articolo_id, {
          articolo_id: r.articolo_id, codice: r.codice, tipologia: r.tipologia,
          colore: r.colore, genere: r.genere, taglia: r.taglia, soglia_min: r.soglia_min,
          perAzienda: {}, totale: 0,
        })
      }
      const riga = mappa.get(r.articolo_id)
      riga.perAzienda[r.azienda_id] = r.giacenza_attuale
      riga.totale += r.giacenza_attuale
    }
    return [...mappa.values()]
  }, [righe])

  const filtrate = pivot.filter(r =>
    (!filtroTipologia || r.tipologia === filtroTipologia) &&
    (!filtroColore || r.colore === filtroColore) &&
    (!filtroGenere || r.genere === filtroGenere) &&
    (!soloScorteBasse || r.totale <= r.soglia_min)
  )

  const totaliPerAzienda = aziende.reduce((acc, az) => {
    acc[az.id] = filtrate.reduce((s, r) => s + (r.perAzienda[az.id] || 0), 0)
    return acc
  }, {})
  const totaleGenerale = filtrate.reduce((s, r) => s + r.totale, 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Giacenze</h2>
          <p className="sub">Scorta attuale per articolo, separata per società e totale complessivo.</p>
        </div>
        <button className="btn btn-secondary" onClick={load}>Aggiorna</button>
      </div>

      {error && <div className="alert error">{error}</div>}

      {aziende.length === 0 && !loading && (
        <div className="alert error">Nessuna società trovata. Verifica di aver eseguito lo script di migrazione su Supabase.</div>
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
          Solo scorte basse (totale)
        </label>
      </div>

      {/* Riepilogo totali per società — sempre visibile in cima */}
      <div className="card">
        <h3>Totale pezzi in giacenza per società</h3>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {aziende.map(az => (
            <div key={az.id} style={{
              flex: '1 1 200px', border: '1px solid var(--line)', borderRadius: 8,
              padding: '14px 16px', background: 'var(--canvas)',
            }}>
              <div style={{ fontSize: 12.5, color: 'var(--graphite)', marginBottom: 4 }}>{az.nome}</div>
              <div className="mono" style={{ fontSize: 22, fontWeight: 600 }}>{totaliPerAzienda[az.id] ?? 0}</div>
            </div>
          ))}
          <div style={{
            flex: '1 1 200px', border: '1px solid var(--ink)', borderRadius: 8,
            padding: '14px 16px', background: 'var(--ink)', color: '#fff',
          }}>
            <div style={{ fontSize: 12.5, color: '#C7CCD4', marginBottom: 4 }}>Totale generale</div>
            <div className="mono" style={{ fontSize: 22, fontWeight: 600 }}>{totaleGenerale}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>{filtrate.length} articoli</h3>
        {loading ? (
          <div className="empty-state">Caricamento…</div>
        ) : filtrate.length === 0 ? (
          <div className="empty-state">Nessun articolo trovato con questi filtri.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Articolo</th>
                  <th>Tipologia</th>
                  {aziende.map(az => <th key={az.id} style={{ textAlign: 'right' }}>{az.nome}</th>)}
                  <th style={{ textAlign: 'right' }}>Totale</th>
                  <th>Stato</th>
                </tr>
              </thead>
              <tbody>
                {filtrate.map(r => {
                  const basso = r.totale <= r.soglia_min
                  return (
                    <tr key={r.articolo_id}>
                      <td><TagChip colore={r.colore} genere={r.genere} taglia={r.taglia} codice={r.codice} /></td>
                      <td>{r.tipologia}</td>
                      {aziende.map(az => (
                        <td key={az.id} className="mono" style={{ textAlign: 'right' }}>
                          {r.perAzienda[az.id] ?? 0}
                        </td>
                      ))}
                      <td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>{r.totale}</td>
                      <td><span className={`badge ${basso ? 'low' : 'ok'}`}>{basso ? 'Scorta bassa' : 'OK'}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
