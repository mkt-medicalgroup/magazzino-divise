import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import TagChip from '../components/TagChip'

const STATI = ['Consegnato', 'Reso', 'Altro']

export default function Dipendenti() {
  const [dipendenti, setDipendenti] = useState([])
  const [sedi, setSedi] = useState([])
  const [ruoli, setRuoli] = useState([])
  const [aziende, setAziende] = useState([])
  const [totaliAssegnati, setTotaliAssegnati] = useState({}) // dipendente_id -> numero pezzi attualmente assegnati
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [filtroSede, setFiltroSede] = useState('')
  const [aperto, setAperto] = useState(null)
  const [storico, setStorico] = useState({})
  const [inModifica, setInModifica] = useState(null) // id dipendente in modifica
  const [formModifica, setFormModifica] = useState({ nome: '', cognome: '', sede_id: '', ruolo_id: '' })
  const [articoli, setArticoli] = useState([])
  const [formAssegna, setFormAssegna] = useState({ articolo_id: '', quantita: 1, data_assegnazione: new Date().toISOString().slice(0, 10), note: '' })
  const [erroreAssegna, setErroreAssegna] = useState('')

  const vuoto = { nome: '', cognome: '', sede_id: '', ruolo_id: '' }
  const [form, setForm] = useState(vuoto)
  const [nuovaSede, setNuovaSede] = useState('')
  const [nuovaSedeRegione, setNuovaSedeRegione] = useState('')
  const [nuovaSedeAzienda, setNuovaSedeAzienda] = useState('')
  const [nuovoRuolo, setNuovoRuolo] = useState('')

  // Sedi raggruppate per regione, per popolare i menu a tendina in modo ordinato
  const sediPerRegione = sedi.reduce((acc, s) => {
    const reg = s.regione || 'Altre sedi'
    acc[reg] = acc[reg] || []
    acc[reg].push(s)
    return acc
  }, {})
  const regioniOrdinate = Object.keys(sediPerRegione).sort()

  async function load() {
    setLoading(true)
    const [{ data: dip, error: dipErr }, { data: sd }, { data: rl }, { data: az }, { data: assegnazioni }, { data: art }] = await Promise.all([
      supabase.from('dipendenti').select('*, sedi(nome, regione, azienda_id), ruoli(nome)').eq('attivo', true).order('cognome'),
      supabase.from('sedi').select('*, aziende(nome)').order('nome'),
      supabase.from('ruoli').select('*').order('nome'),
      supabase.from('aziende').select('*').order('nome'),
      supabase.from('assegnazioni').select('dipendente_id, quantita, stato'),
      supabase.from('articoli').select('*').eq('attivo', true).order('tipologia'),
    ])
    if (dipErr) setError(dipErr.message)
    setDipendenti(dip || [])
    setSedi(sd || [])
    setRuoli(rl || [])
    setAziende(az || [])
    setArticoli(art || [])

    const totali = {}
    for (const a of assegnazioni || []) {
      if ((a.stato || 'Consegnato') === 'Reso') continue // reso: non conta più come assegnato
      totali[a.dipendente_id] = (totali[a.dipendente_id] || 0) + a.quantita
    }
    setTotaliAssegnati(totali)

    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setSuccess('')
    if (!form.nome.trim() || !form.cognome.trim()) return setError('Nome e cognome sono obbligatori.')

    const { error } = await supabase.from('dipendenti').insert({
      nome: form.nome.trim(),
      cognome: form.cognome.trim(),
      sede_id: form.sede_id || null,
      ruolo_id: form.ruolo_id || null,
    })
    if (error) return setError(error.message)
    setSuccess('Dipendente aggiunto.')
    setForm(vuoto)
    load()
  }

  function apriModifica(d) {
    setInModifica(d.id)
    setFormModifica({
      nome: d.nome, cognome: d.cognome,
      sede_id: d.sede_id || '', ruolo_id: d.ruolo_id || '',
    })
  }

  async function salvaModifica(id) {
    if (!formModifica.nome.trim() || !formModifica.cognome.trim()) return
    await supabase.from('dipendenti').update({
      nome: formModifica.nome.trim(),
      cognome: formModifica.cognome.trim(),
      sede_id: formModifica.sede_id || null,
      ruolo_id: formModifica.ruolo_id || null,
    }).eq('id', id)
    setInModifica(null)
    load()
  }

  async function aggiungiSede(e) {
    e.preventDefault()
    if (!nuovaSede.trim()) return
    const { error } = await supabase.from('sedi').insert({
      nome: nuovaSede.trim(),
      regione: nuovaSedeRegione.trim() || null,
      azienda_id: nuovaSedeAzienda || null,
    })
    if (!error) { setNuovaSede(''); setNuovaSedeRegione(''); setNuovaSedeAzienda(''); load() }
  }

  async function aggiornaSocietaSede(sedeId, aziendaId) {
    await supabase.from('sedi').update({ azienda_id: aziendaId || null }).eq('id', sedeId)
    load()
  }

  async function aggiungiRuolo(e) {
    e.preventDefault()
    if (!nuovoRuolo.trim()) return
    const { error } = await supabase.from('ruoli').insert({ nome: nuovoRuolo.trim() })
    if (!error) { setNuovoRuolo(''); load() }
  }

  async function disattiva(id) {
    if (!confirm('Disattivare questo dipendente? Lo storico assegnazioni resterà comunque visibile.')) return
    await supabase.from('dipendenti').update({ attivo: false }).eq('id', id)
    load()
  }

  async function toggleStorico(id) {
    if (aperto === id) { setAperto(null); return }
    setAperto(id)
    setFormAssegna({ articolo_id: '', quantita: 1, data_assegnazione: new Date().toISOString().slice(0, 10), note: '' })
    setErroreAssegna('')
    await caricaStorico(id)
  }

  async function creaAssegnazione(dipendente) {
    setErroreAssegna('')
    if (!formAssegna.articolo_id) return setErroreAssegna('Seleziona un articolo.')
    const { data: userData } = await supabase.auth.getUser()
    const { error } = await supabase.from('assegnazioni').insert({
      data_assegnazione: formAssegna.data_assegnazione,
      articolo_id: formAssegna.articolo_id,
      azienda_id: dipendente.sedi?.azienda_id || null,
      dipendente_id: dipendente.id,
      quantita: Number(formAssegna.quantita),
      stato: 'Consegnato',
      note: formAssegna.note || null,
      creato_da: userData?.user?.id || null,
    })
    if (error) {
      setErroreAssegna(error.message.includes('Giacenza insufficiente') ? error.message : `Errore: ${error.message}`)
      return
    }
    setFormAssegna({ articolo_id: '', quantita: 1, data_assegnazione: new Date().toISOString().slice(0, 10), note: '' })
    await caricaStorico(dipendente.id)
    load()
  }

  async function caricaStorico(id) {
    const { data } = await supabase.from('assegnazioni')
      .select('*, articoli(codice, tipologia, colore, colore_hex, genere, taglia), aziende(nome)')
      .eq('dipendente_id', id)
      .order('data_assegnazione', { ascending: false })
    setStorico(s => ({ ...s, [id]: data || [] }))
  }

  async function aggiornaAssegnazione(dipendenteId, assegnazioneId, campi) {
    await supabase.from('assegnazioni').update(campi).eq('id', assegnazioneId)
    await caricaStorico(dipendenteId)
    // il totale assegnato e le giacenze possono essere cambiati (es. Reso) -> ricarico tutto
    load()
  }

  const filtrati = filtroSede ? dipendenti.filter(d => d.sede_id === filtroSede) : dipendenti

  const gruppi = filtrati.reduce((acc, d) => {
    const nomeSede = d.sedi?.nome || 'Senza sede'
    const regione = d.sedi?.regione || ''
    acc[nomeSede] = acc[nomeSede] || { regione, dipendenti: [] }
    acc[nomeSede].dipendenti.push(d)
    return acc
  }, {})
  const gruppiOrdinati = Object.entries(gruppi).sort((a, b) => {
    const regA = a[1].regione, regB = b[1].regione
    if (regA !== regB) return regA.localeCompare(regB)
    return a[0].localeCompare(b[0])
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Dipendenti</h2>
          <p className="sub">Elenco dipendenti diviso per sede, con ruolo, divise assegnate e storico consegne/resi.</p>
        </div>
      </div>

      <div className="card">
        <h3>Nuovo dipendente</h3>
        {error && <div className="alert error">{error}</div>}
        {success && <div className="alert success">{success}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field">
              <label>Nome</label>
              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required />
            </div>
            <div className="field">
              <label>Cognome</label>
              <input value={form.cognome} onChange={e => setForm(f => ({ ...f, cognome: e.target.value }))} required />
            </div>
            <div className="field">
              <label>Sede</label>
              <select value={form.sede_id} onChange={e => setForm(f => ({ ...f, sede_id: e.target.value }))}>
                <option value="">— nessuna —</option>
                {regioniOrdinate.map(reg => (
                  <optgroup key={reg} label={reg}>
                    {sediPerRegione[reg].map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Ruolo</label>
              <select value={form.ruolo_id} onChange={e => setForm(f => ({ ...f, ruolo_id: e.target.value }))}>
                <option value="">— nessuno —</option>
                {ruoli.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
              </select>
            </div>
          </div>
          <button className="btn btn-primary">Aggiungi dipendente</button>
        </form>

        <details style={{ marginTop: 16 }}>
          <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--graphite)' }}>Gestisci sedi, ruoli e società di fatturazione</summary>

          <div style={{ display: 'flex', gap: 24, marginTop: 12, flexWrap: 'wrap' }}>
            <form onSubmit={aggiungiSede} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Nuova sede</label>
                <input value={nuovaSede} onChange={e => setNuovaSede(e.target.value)} placeholder="es. Centro Medico Est" />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Regione</label>
                <input value={nuovaSedeRegione} onChange={e => setNuovaSedeRegione(e.target.value)} placeholder="es. Lombardia" list="elenco-regioni" />
                <datalist id="elenco-regioni">
                  {regioniOrdinate.map(r => <option key={r} value={r} />)}
                </datalist>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Società che fattura</label>
                <select value={nuovaSedeAzienda} onChange={e => setNuovaSedeAzienda(e.target.value)}>
                  <option value="">— da collegare —</option>
                  {aziende.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
              </div>
              <button className="btn btn-secondary">Aggiungi sede</button>
            </form>
            <form onSubmit={aggiungiRuolo} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Nuovo ruolo</label>
                <input value={nuovoRuolo} onChange={e => setNuovoRuolo(e.target.value)} placeholder="es. Caposala" />
              </div>
              <button className="btn btn-secondary">Aggiungi ruolo</button>
            </form>
          </div>

          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--graphite)', marginBottom: 8 }}>
              Società di fatturazione per sede esistente
            </div>
            <table>
              <thead>
                <tr><th>Sede</th><th>Società che fattura</th></tr>
              </thead>
              <tbody>
                {sedi.map(s => (
                  <tr key={s.id}>
                    <td>{s.nome}</td>
                    <td>
                      <select value={s.azienda_id || ''} onChange={e => aggiornaSocietaSede(s.id, e.target.value)}>
                        <option value="">— non collegata —</option>
                        {aziende.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>

      <div className="filter-bar">
        <select value={filtroSede} onChange={e => setFiltroSede(e.target.value)}>
          <option value="">Tutte le sedi</option>
          {regioniOrdinate.map(reg => (
            <optgroup key={reg} label={reg}>
              {sediPerRegione[reg].map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </optgroup>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="card"><div className="empty-state">Caricamento…</div></div>
      ) : gruppiOrdinati.length === 0 ? (
        <div className="card"><div className="empty-state">Nessun dipendente trovato.</div></div>
      ) : (
        gruppiOrdinati.map(([nomeSede, gruppo]) => (
          <div className="card" key={nomeSede}>
            <h3>
              {nomeSede} — {gruppo.dipendenti.length} dipendenti
              {gruppo.regione && <span style={{ color: 'var(--graphite)', fontWeight: 400 }}> · {gruppo.regione}</span>}
            </h3>
            <table>
              <thead>
                <tr>
                  <th>Cognome e nome</th>
                  <th>Ruolo</th>
                  <th>Divise assegnate</th>
                  <th></th>
                  <th></th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {gruppo.dipendenti.map(d => (
                  <>
                    {inModifica === d.id ? (
                      <tr key={d.id} style={{ background: 'var(--canvas)' }}>
                        <td colSpan={6}>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', padding: '6px 0' }}>
                            <div className="field" style={{ marginBottom: 0 }}>
                              <label>Nome</label>
                              <input value={formModifica.nome} onChange={e => setFormModifica(f => ({ ...f, nome: e.target.value }))} />
                            </div>
                            <div className="field" style={{ marginBottom: 0 }}>
                              <label>Cognome</label>
                              <input value={formModifica.cognome} onChange={e => setFormModifica(f => ({ ...f, cognome: e.target.value }))} />
                            </div>
                            <div className="field" style={{ marginBottom: 0 }}>
                              <label>Sede</label>
                              <select value={formModifica.sede_id} onChange={e => setFormModifica(f => ({ ...f, sede_id: e.target.value }))}>
                                <option value="">— nessuna —</option>
                                {regioniOrdinate.map(reg => (
                                  <optgroup key={reg} label={reg}>
                                    {sediPerRegione[reg].map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                                  </optgroup>
                                ))}
                              </select>
                            </div>
                            <div className="field" style={{ marginBottom: 0 }}>
                              <label>Ruolo</label>
                              <select value={formModifica.ruolo_id} onChange={e => setFormModifica(f => ({ ...f, ruolo_id: e.target.value }))}>
                                <option value="">— nessuno —</option>
                                {ruoli.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
                              </select>
                            </div>
                            <button className="btn btn-primary" onClick={() => salvaModifica(d.id)} type="button">Salva</button>
                            <button className="btn btn-secondary" onClick={() => setInModifica(null)} type="button">Annulla</button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={d.id}>
                        <td>{d.cognome} {d.nome}</td>
                        <td style={{ color: 'var(--graphite)' }}>{d.ruoli?.nome || '—'}</td>
                        <td>
                          <span className="badge ok" style={{ background: totaliAssegnati[d.id] ? 'var(--moss-bg)' : '#F0EEE7', color: totaliAssegnati[d.id] ? 'var(--moss)' : 'var(--graphite)' }}>
                            {totaliAssegnati[d.id] || 0} pezzi
                          </span>
                        </td>
                        <td><button className="btn btn-secondary" onClick={() => apriModifica(d)}>Modifica</button></td>
                        <td><button className="btn btn-secondary" onClick={() => toggleStorico(d.id)}>{aperto === d.id ? 'Nascondi storico' : 'Vedi divise assegnate'}</button></td>
                        <td><button className="btn btn-secondary" onClick={() => disattiva(d.id)}>Disattiva</button></td>
                      </tr>
                    )}
                    {aperto === d.id && (
                      <tr>
                        <td colSpan={6} style={{ background: 'var(--canvas)' }}>
                          <div style={{ padding: '10px 0', borderBottom: '1px solid var(--line)', marginBottom: 10 }}>
                            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--graphite)', marginBottom: 8 }}>Assegna una nuova divisa</div>
                            {erroreAssegna && <div className="alert error" style={{ marginBottom: 8 }}>{erroreAssegna}</div>}
                            {!d.sedi?.azienda_id && (
                              <div className="alert error" style={{ marginBottom: 8 }}>
                                La sede di questo dipendente non è collegata a nessuna società: collegala in "Gestisci sedi" qui sopra prima di assegnare una divisa.
                              </div>
                            )}
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                              <input type="date" value={formAssegna.data_assegnazione} onChange={e => setFormAssegna(f => ({ ...f, data_assegnazione: e.target.value }))} style={{ padding: '7px 9px', border: '1px solid var(--line)', borderRadius: 6 }} />
                              <select value={formAssegna.articolo_id} onChange={e => setFormAssegna(f => ({ ...f, articolo_id: e.target.value }))} style={{ padding: '7px 9px', border: '1px solid var(--line)', borderRadius: 6, flex: 2, minWidth: 220 }}>
                                <option value="">Seleziona articolo…</option>
                                {articoli.map(a => (
                                  <option key={a.id} value={a.id}>{a.tipologia} · {a.colore} · {a.genere} · {a.taglia} ({a.codice})</option>
                                ))}
                              </select>
                              <input type="number" min="1" value={formAssegna.quantita} onChange={e => setFormAssegna(f => ({ ...f, quantita: e.target.value }))} style={{ width: 70, padding: '7px 9px', border: '1px solid var(--line)', borderRadius: 6 }} />
                              <input type="text" placeholder="Note" value={formAssegna.note} onChange={e => setFormAssegna(f => ({ ...f, note: e.target.value }))} style={{ flex: 1, minWidth: 120, padding: '7px 9px', border: '1px solid var(--line)', borderRadius: 6 }} />
                              <button type="button" className="btn btn-primary" onClick={() => creaAssegnazione(d)} disabled={!d.sedi?.azienda_id}>Assegna</button>
                            </div>
                          </div>
                          {!storico[d.id] ? (
                            <span style={{ color: 'var(--graphite)' }}>Caricamento…</span>
                          ) : storico[d.id].length === 0 ? (
                            <span style={{ color: 'var(--graphite)' }}>Nessuna divisa assegnata finora.</span>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 0' }}>
                              {storico[d.id].map(a => (
                                <div key={a.id} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13, flexWrap: 'wrap' }}>
                                  <span className="mono" style={{ color: 'var(--graphite)', width: 90 }}>{a.data_assegnazione}</span>
                                  {a.articoli && <TagChip colore={a.articoli.colore} coloreHex={a.articoli.colore_hex} genere={a.articoli.genere} taglia={a.articoli.taglia} codice={a.articoli.codice} />}
                                  <span>{a.articoli?.tipologia}</span>
                                  <span className="mono">×{a.quantita}</span>
                                  {a.aziende && <span style={{ color: 'var(--steel)', fontSize: 12 }}>{a.aziende.nome}</span>}
                                  <select
                                    value={a.stato || 'Consegnato'}
                                    onChange={e => aggiornaAssegnazione(d.id, a.id, { stato: e.target.value })}
                                    style={{ fontSize: 12, padding: '3px 6px', borderRadius: 4, border: '1px solid var(--line)' }}
                                  >
                                    {STATI.map(s => <option key={s} value={s}>{s}</option>)}
                                  </select>
                                  <input
                                    type="text"
                                    defaultValue={a.note || ''}
                                    placeholder="Note…"
                                    onBlur={e => { if (e.target.value !== (a.note || '')) aggiornaAssegnazione(d.id, a.id, { note: e.target.value || null }) }}
                                    style={{ fontSize: 12, padding: '3px 6px', borderRadius: 4, border: '1px solid var(--line)', flex: '1 1 140px', minWidth: 120 }}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  )
}
