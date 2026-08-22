import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { usePersistentState } from '../lib/usePersistentState'

export default function RichiesteScarico() {
  const [richieste, setRichieste] = useState([])
  const [stockSedi, setStockSedi] = useState([])
  const [sedi, setSedi] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filtroStato, setFiltroStato] = usePersistentState('richiesteScarico.filtroStato', 'Da evadere')
  const [filtroSedeStock, setFiltroSedeStock] = usePersistentState('richiesteScarico.filtroSede', '')

  async function load() {
    setLoading(true)
    const [{ data: rich, error: err }, { data: stock }, { data: sd }] = await Promise.all([
      supabase.from('richieste_scarico').select('*, dipendenti(nome, cognome), sedi(nome)').order('created_at', { ascending: false }),
      supabase.from('stock_sedi').select('*'),
      supabase.from('sedi').select('*').order('nome'),
    ])
    if (err) { setError(err.message); setLoading(false); return }

    const ids = (rich || []).map(r => r.id)
    let righePerRichiesta = {}
    if (ids.length > 0) {
      const { data: righe } = await supabase
        .from('richieste_scarico_righe')
        .select('*, articoli(codice, tipologia, colore, genere, taglia)')
        .in('richiesta_id', ids)
      for (const r of righe || []) {
        righePerRichiesta[r.richiesta_id] = righePerRichiesta[r.richiesta_id] || []
        righePerRichiesta[r.richiesta_id].push(r)
      }
    }

    setRichieste((rich || []).map(r => ({ ...r, righe: righePerRichiesta[r.id] || [] })))
    setStockSedi(stock || [])
    setSedi(sd || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    supabase.from('notifiche').update({ letta: true }).eq('tipo', 'scarico').eq('letta', false).then(() => {})
  }, [])

  async function evadi(richiesta) {
    const inserimenti = richiesta.righe.map(riga => ({
      sede_id: richiesta.sede_id,
      articolo_id: riga.articolo_id,
      quantita: riga.quantita,
      note: `Da richiesta di restituzione del ${new Date(richiesta.created_at).toLocaleDateString('it-IT')}`,
      richiesta_scarico_id: richiesta.id,
    }))
    if (!richiesta.sede_id) { setError('Questa richiesta non ha una sede associata: impossibile registrare lo stock. Verifica la sede del dipendente.'); return }

    const { error: err } = await supabase.from('stock_sedi_movimenti').insert(inserimenti)
    if (err) { setError(`Errore nel registrare lo stock: ${err.message}`); return }

    await supabase.from('richieste_scarico').update({ stato: 'Evaso', evaso_at: new Date().toISOString() }).eq('id', richiesta.id)
    load()
  }

  async function riapri(id) {
    // Nota: riaprire non toglie automaticamente lo stock già registrato in stock_sedi_movimenti.
    await supabase.from('richieste_scarico').update({ stato: 'Da evadere', evaso_at: null }).eq('id', id)
    load()
  }

  const richiesteFiltrate = filtroStato === 'Tutte' ? richieste : richieste.filter(r => r.stato === filtroStato)
  const stockFiltrato = filtroSedeStock ? stockSedi.filter(s => s.sede_id === filtroSedeStock) : stockSedi
  const totaleStock = stockFiltrato.reduce((s, r) => s + r.quantita, 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Scarico</h2>
          <p className="sub">Restituzioni di divise (es. dipendenti che lasciano l'azienda). Evadendo la richiesta, le quantità entrano nello stock della sede.</p>
        </div>
        <button className="btn btn-secondary" onClick={load}>Aggiorna</button>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ margin: 0 }}>Stock sedi</h3>
          <span className="mono" style={{ fontSize: 16, fontWeight: 600 }}>{totaleStock} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--graphite)' }}>pezzi</span></span>
        </div>
        <div className="filter-bar">
          <select value={filtroSedeStock} onChange={e => setFiltroSedeStock(e.target.value)}>
            <option value="">Tutte le sedi</option>
            {sedi.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </div>
        {stockFiltrato.length === 0 ? (
          <div className="empty-state">Nessuna divisa in stock sede al momento.</div>
        ) : (
          <table>
            <thead><tr><th>Sede</th><th>Articolo</th><th>Taglia</th><th style={{ textAlign: 'right' }}>Q.tà</th></tr></thead>
            <tbody>
              {stockFiltrato.map(s => (
                <tr key={`${s.sede_id}-${s.articolo_id}`}>
                  <td>{s.sede_nome}</td>
                  <td>{s.tipologia} · {s.colore} <span style={{ color: 'var(--graphite)', fontSize: 12.5 }}>({s.genere})</span></td>
                  <td className="mono">{s.taglia}</td>
                  <td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>{s.quantita}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="filter-bar">
        <select value={filtroStato} onChange={e => setFiltroStato(e.target.value)}>
          <option value="Da evadere">Da evadere</option>
          <option value="Evaso">Evase</option>
          <option value="Tutte">Tutte</option>
        </select>
      </div>

      {loading ? (
        <div className="card"><div className="empty-state">Caricamento…</div></div>
      ) : richiesteFiltrate.length === 0 ? (
        <div className="card"><div className="empty-state">Nessuna richiesta trovata.</div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {richiesteFiltrate.map(r => (
            <div className="card" key={r.id} style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{r.dipendenti?.cognome} {r.dipendenti?.nome}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--graphite)', marginTop: 2 }}>
                    {r.sedi?.nome || 'sede non indicata'} · segnalato il {new Date(r.created_at).toLocaleDateString('it-IT')}
                    {r.richiedente && <> · da {r.richiedente}</>}
                  </div>
                </div>
                <span className={`badge ${r.stato === 'Evaso' ? 'ok' : 'low'}`}>{r.stato}</span>
              </div>

              {r.note && <div style={{ fontSize: 13, color: 'var(--graphite)', marginBottom: 10 }}>Note: {r.note}</div>}

              <table>
                <thead><tr><th>Articolo</th><th style={{ textAlign: 'right' }}>Qtà</th></tr></thead>
                <tbody>
                  {r.righe.map(riga => (
                    <tr key={riga.id}>
                      <td>{riga.articoli?.tipologia} · {riga.articoli?.colore} · {riga.articoli?.genere} · {riga.articoli?.taglia}</td>
                      <td className="mono" style={{ textAlign: 'right' }}>{riga.quantita}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                {r.stato === 'Da evadere' ? (
                  <button className="btn btn-primary" onClick={() => evadi(r)}>Evadi (registra in stock sede)</button>
                ) : (
                  <button className="btn btn-secondary" onClick={() => riapri(r.id)}>Riapri</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
