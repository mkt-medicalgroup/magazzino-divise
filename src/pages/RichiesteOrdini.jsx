import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { usePersistentState } from '../lib/usePersistentState'

export default function RichiesteOrdini() {
  const [richieste, setRichieste] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filtroStato, setFiltroStato] = usePersistentState('richiesteOrdini.filtroStato', 'Da evadere')

  async function load() {
    setLoading(true)
    const { data: rich, error: err } = await supabase
      .from('richieste_ordini')
      .select('*, dipendenti(nome, cognome), sedi(nome)')
      .order('created_at', { ascending: false })
    if (err) { setError(err.message); setLoading(false); return }

    const ids = (rich || []).map(r => r.id)
    let righePerRichiesta = {}
    if (ids.length > 0) {
      const { data: righe } = await supabase
        .from('richieste_ordini_righe')
        .select('*, articoli(codice, tipologia, colore, genere, taglia)')
        .in('richiesta_id', ids)
      for (const r of righe || []) {
        righePerRichiesta[r.richiesta_id] = righePerRichiesta[r.richiesta_id] || []
        righePerRichiesta[r.richiesta_id].push(r)
      }
    }

    setRichieste((rich || []).map(r => ({ ...r, righe: righePerRichiesta[r.id] || [] })))
    setLoading(false)
  }

  useEffect(() => {
    load()
    // Segna come lette le notifiche relative agli ordini quando si apre questa pagina
    supabase.from('notifiche').update({ letta: true }).eq('tipo', 'ordine').eq('letta', false).then(() => {})
  }, [])

  async function segnaEvaso(id) {
    await supabase.from('richieste_ordini').update({ stato: 'Evaso', evaso_at: new Date().toISOString() }).eq('id', id)
    load()
  }

  async function riapri(id) {
    await supabase.from('richieste_ordini').update({ stato: 'Da evadere', evaso_at: null }).eq('id', id)
    load()
  }

  async function creaAnagrafica(richiesta) {
    const { data, error: err } = await supabase.from('dipendenti').insert({
      nome: richiesta.nuovo_nome, cognome: richiesta.nuovo_cognome, sede_id: richiesta.sede_id,
    }).select().single()
    if (err) { setError(`Errore nel creare l'anagrafica: ${err.message}`); return }
    await supabase.from('richieste_ordini').update({ dipendente_id: data.id }).eq('id', richiesta.id)
    load()
  }

  const richiesteFiltrate = filtroStato === 'Tutte' ? richieste : richieste.filter(r => r.stato === filtroStato)

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Richieste — Ordini</h2>
          <p className="sub">Ordini richiesti dal modulo pubblico, da evadere registrando poi il carico/l'assegnazione in Movimenti.</p>
        </div>
        <button className="btn btn-secondary" onClick={load}>Aggiorna</button>
      </div>

      {error && <div className="alert error">{error}</div>}

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
          {richiesteFiltrate.map(r => {
            const nomePersona = r.dipendente_id ? `${r.dipendenti?.cognome || ''} ${r.dipendenti?.nome || ''}` : `${r.nuovo_cognome || ''} ${r.nuovo_nome || ''}`
            const eNuovo = !r.dipendente_id
            return (
              <div className="card" key={r.id} style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>
                      {nomePersona.trim() || '—'}
                      {eNuovo && <span className="badge low" style={{ marginLeft: 8 }}>Nuovo assunto</span>}
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--graphite)', marginTop: 2 }}>
                      {r.sedi?.nome || 'sede non indicata'} · richiesto il {new Date(r.created_at).toLocaleDateString('it-IT')}
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
                  {eNuovo && (
                    <button className="btn btn-secondary" onClick={() => creaAnagrafica(r)}>Crea anagrafica dipendente</button>
                  )}
                  {r.stato === 'Da evadere' ? (
                    <button className="btn btn-primary" onClick={() => segnaEvaso(r.id)}>Segna come evaso</button>
                  ) : (
                    <button className="btn btn-secondary" onClick={() => riapri(r.id)}>Riapri</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
