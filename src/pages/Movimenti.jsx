import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import TagChip from '../components/TagChip'

const oggi = () => new Date().toISOString().slice(0, 10)
const nuovaRiga = () => ({ _key: crypto.randomUUID(), articolo_id: '', quantita: 1 })

export default function Movimenti() {
  const [articoli, setArticoli] = useState([])
  const [aziende, setAziende] = useState([])
  const [dipendenti, setDipendenti] = useState([])
  const [movimenti, setMovimenti] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [filtroAzienda, setFiltroAzienda] = useState('')
  const [inModifica, setInModifica] = useState(null) // id riga movimento in modifica
  const [formModifica, setFormModifica] = useState({ data_mov: '', articolo_id: '', quantita: 1, note: '' })

  const [modalita, setModalita] = useState('movimento') // 'movimento' | 'assegna'

  const [testata, setTestata] = useState({ data_mov: oggi(), tipo: 'Scarico', azienda_id: '', riferimento: '', note: '' })
  const [righe, setRighe] = useState([nuovaRiga()])

  const [assegnaForm, setAssegnaForm] = useState({ data_assegnazione: oggi(), articolo_id: '', note: '' })
  const [selezioni, setSelezioni] = useState({}) // dipendente_id -> { selezionato, quantita }
  const [ricercaDipendente, setRicercaDipendente] = useState('')
  const [erroreAssegna, setErroreAssegna] = useState('')
  const [successoAssegna, setSuccessoAssegna] = useState('')

  async function loadAll() {
    setLoading(true)
    const [{ data: art }, { data: az }, { data: dip }, { data: mov, error: movErr }] = await Promise.all([
      supabase.from('articoli').select('*').eq('attivo', true).order('tipologia'),
      supabase.from('aziende').select('*').order('nome'),
      supabase.from('dipendenti').select('*, sedi(nome, azienda_id)').eq('attivo', true).order('cognome'),
      supabase.from('movimenti')
        .select('*, articoli(codice, tipologia, colore, colore_hex, genere, taglia), aziende(nome)')
        .order('data_mov', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(200),
    ])
    setArticoli(art || [])
    setAziende(az || [])
    setDipendenti(dip || [])
    if (movErr) setError(movErr.message)
    setMovimenti(mov || [])
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  function aggiornaRiga(key, campo, valore) {
    setRighe(rs => rs.map(r => (r._key === key ? { ...r, [campo]: valore } : r)))
  }
  function aggiungiRiga() {
    setRighe(rs => [...rs, nuovaRiga()])
  }
  function rimuoviRiga(key) {
    setRighe(rs => (rs.length === 1 ? rs : rs.filter(r => r._key !== key)))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setSuccess('')

    if (!testata.azienda_id) return setError('Seleziona la società.')
    const righeValide = righe.filter(r => r.articolo_id && Number(r.quantita) > 0)
    if (righeValide.length === 0) return setError('Aggiungi almeno un articolo con quantità valida.')

    const { data: userData } = await supabase.auth.getUser()
    const gruppoId = crypto.randomUUID()

    const payload = righeValide.map(r => ({
      data_mov: testata.data_mov,
      tipo: testata.tipo,
      azienda_id: testata.azienda_id,
      riferimento: testata.riferimento || null,
      gruppo_id: gruppoId,
      articolo_id: r.articolo_id,
      quantita: Number(r.quantita),
      note: testata.note || null,
      creato_da: userData?.user?.id || null,
    }))

    const { error } = await supabase.from('movimenti').insert(payload)
    if (error) {
      setError(error.message.includes('Giacenza insufficiente') ? error.message : `Errore: ${error.message}`)
      return
    }
    setSuccess(`Movimento registrato: ${righeValide.length} voce/i.`)
    setTestata(t => ({ ...t, riferimento: '', note: '' }))
    setRighe([nuovaRiga()])
    loadAll()
  }

  function apriModifica(m) {
    setInModifica(m.id)
    setFormModifica({ data_mov: m.data_mov, articolo_id: m.articolo_id, quantita: m.quantita, note: m.note || '' })
  }

  async function salvaModifica(id) {
    if (!formModifica.articolo_id || Number(formModifica.quantita) <= 0) return
    const { error } = await supabase.from('movimenti').update({
      data_mov: formModifica.data_mov,
      articolo_id: formModifica.articolo_id,
      quantita: Number(formModifica.quantita),
      note: formModifica.note || null,
    }).eq('id', id)
    if (error) { setError(`Errore nel salvare la modifica: ${error.message}`); return }
    setInModifica(null)
    loadAll()
  }

  async function eliminaRiga(id) {
    if (!confirm('Eliminare questa voce? La quantità verrà rimossa dal calcolo della giacenza.')) return
    await supabase.from('movimenti').delete().eq('id', id)
    loadAll()
  }

  function toggleSelezione(id, checked) {
    setSelezioni(s => ({ ...s, [id]: { selezionato: checked, quantita: s[id]?.quantita || 1 } }))
  }
  function aggiornaQuantitaSelezione(id, quantita) {
    setSelezioni(s => ({ ...s, [id]: { selezionato: s[id]?.selezionato ?? true, quantita } }))
  }

  async function handleAssegnaSubmit(e) {
    e.preventDefault()
    setErroreAssegna(''); setSuccessoAssegna('')

    if (!assegnaForm.articolo_id) return setErroreAssegna('Seleziona un articolo.')
    const selezionati = dipendenti.filter(d => selezioni[d.id]?.selezionato && Number(selezioni[d.id]?.quantita) > 0)
    if (selezionati.length === 0) return setErroreAssegna('Seleziona almeno un dipendente con una quantità valida.')
    const senzaAzienda = selezionati.filter(d => !d.sedi?.azienda_id)
    if (senzaAzienda.length > 0) {
      return setErroreAssegna(`Questi dipendenti non hanno una sede collegata a una società: ${senzaAzienda.map(d => `${d.cognome} ${d.nome}`).join(', ')}. Collegala in Dipendenti > Gestisci sedi prima di procedere.`)
    }

    const { data: userData } = await supabase.auth.getUser()
    const payload = selezionati.map(d => ({
      data_assegnazione: assegnaForm.data_assegnazione,
      articolo_id: assegnaForm.articolo_id,
      azienda_id: d.sedi.azienda_id,
      dipendente_id: d.id,
      quantita: Number(selezioni[d.id].quantita),
      stato: 'Consegnato',
      note: assegnaForm.note || null,
      creato_da: userData?.user?.id || null,
    }))

    const { error } = await supabase.from('assegnazioni').insert(payload)
    if (error) {
      setErroreAssegna(error.message.includes('Giacenza insufficiente') ? error.message : `Errore: ${error.message}`)
      return
    }
    setSuccessoAssegna(`Assegnato a ${selezionati.length} dipendenti.`)
    setSelezioni({})
    setAssegnaForm(f => ({ ...f, articolo_id: '', note: '' }))
  }

  const dipendentiVisibili = ricercaDipendente.trim()
    ? dipendenti.filter(d => `${d.cognome} ${d.nome}`.toLowerCase().includes(ricercaDipendente.toLowerCase()))
    : dipendenti
  const numeroSelezionati = Object.values(selezioni).filter(s => s.selezionato).length

  const movimentiFiltrati = filtroAzienda ? movimenti.filter(m => m.azienda_id === filtroAzienda) : movimenti


  // Raggruppa le righe per registrazione (stesso gruppo_id = stessa fattura/registrazione)
  const gruppi = []
  const indiceGruppi = {}
  for (const m of movimentiFiltrati) {
    const chiave = m.gruppo_id || `singola-${m.id}`
    if (!(chiave in indiceGruppi)) {
      indiceGruppi[chiave] = gruppi.length
      gruppi.push({ chiave, data_mov: m.data_mov, tipo: m.tipo, azienda: m.aziende?.nome, riferimento: m.riferimento, righe: [] })
    }
    gruppi[indiceGruppi[chiave]].righe.push(m)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Movimenti</h2>
          <p className="sub">Registra un carico (arrivo dal fornitore) o uno scarico, anche con più articoli insieme (es. le voci di una fattura).</p>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          <button type="button" className={modalita === 'movimento' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setModalita('movimento')}>Carico / Scarico</button>
          <button type="button" className={modalita === 'assegna' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setModalita('assegna')}>Assegna a dipendenti</button>
        </div>

        {modalita === 'assegna' ? (
          <>
            <h3>Assegna un articolo a più dipendenti</h3>
            {erroreAssegna && <div className="alert error">{erroreAssegna}</div>}
            {successoAssegna && <div className="alert success">{successoAssegna}</div>}
            <form onSubmit={handleAssegnaSubmit}>
              <div className="form-grid">
                <div className="field">
                  <label>Data</label>
                  <input type="date" value={assegnaForm.data_assegnazione} onChange={e => setAssegnaForm(f => ({ ...f, data_assegnazione: e.target.value }))} required />
                </div>
                <div className="field" style={{ gridColumn: 'span 2' }}>
                  <label>Articolo</label>
                  <select value={assegnaForm.articolo_id} onChange={e => setAssegnaForm(f => ({ ...f, articolo_id: e.target.value }))} required>
                    <option value="">Seleziona articolo…</option>
                    {articoli.map(a => (
                      <option key={a.id} value={a.id}>{a.tipologia} · {a.colore} · {a.genere} · {a.taglia} ({a.codice})</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Note (per tutti)</label>
                  <input type="text" value={assegnaForm.note} onChange={e => setAssegnaForm(f => ({ ...f, note: e.target.value }))} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px 0' }}>
                <input
                  type="text" placeholder="Cerca dipendente per nome…" value={ricercaDipendente}
                  onChange={e => setRicercaDipendente(e.target.value)}
                  style={{ padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 6, minWidth: 220 }}
                />
                <span style={{ fontSize: 13, color: 'var(--graphite)' }}>{numeroSelezionati} dipendenti selezionati</span>
              </div>

              <div style={{ maxHeight: 360, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 8 }}>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 36 }}></th>
                      <th>Dipendente</th>
                      <th>Sede</th>
                      <th style={{ width: 90 }}>Quantità</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dipendentiVisibili.map(d => {
                      const sel = selezioni[d.id]
                      return (
                        <tr key={d.id}>
                          <td>
                            <input type="checkbox" checked={!!sel?.selezionato} onChange={e => toggleSelezione(d.id, e.target.checked)} />
                          </td>
                          <td>{d.cognome} {d.nome}</td>
                          <td style={{ color: 'var(--graphite)', fontSize: 12.5 }}>{d.sedi?.nome || 'senza sede'}{!d.sedi?.azienda_id && ' — ⚠ società non collegata'}</td>
                          <td>
                            <input
                              type="number" min="1" value={sel?.quantita ?? 1}
                              onChange={e => aggiornaQuantitaSelezione(d.id, e.target.value)}
                              style={{ width: 60, padding: '5px 7px', border: '1px solid var(--line)', borderRadius: 6 }}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <button className="btn btn-primary" style={{ marginTop: 14 }}>Assegna ai dipendenti selezionati</button>
            </form>
          </>
        ) : (
          <>
        <h3>Nuovo movimento</h3>
        {error && <div className="alert error">{error}</div>}
        {success && <div className="alert success">{success}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field">
              <label>Data</label>
              <input type="date" value={testata.data_mov} onChange={e => setTestata(t => ({ ...t, data_mov: e.target.value }))} required />
            </div>
            <div className="field">
              <label>Tipo movimento</label>
              <select value={testata.tipo} onChange={e => setTestata(t => ({ ...t, tipo: e.target.value }))}>
                <option>Scarico</option>
                <option>Carico</option>
              </select>
            </div>
            <div className="field">
              <label>Società</label>
              <select value={testata.azienda_id} onChange={e => setTestata(t => ({ ...t, azienda_id: e.target.value }))} required>
                <option value="">Seleziona società…</option>
                {aziende.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Riferimento (es. n. fattura)</label>
              <input type="text" placeholder="Es. FT-2026-0113" value={testata.riferimento} onChange={e => setTestata(t => ({ ...t, riferimento: e.target.value }))} />
            </div>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>Note generali</label>
              <input type="text" placeholder="Note valide per tutte le voci di questa registrazione" value={testata.note} onChange={e => setTestata(t => ({ ...t, note: e.target.value }))} />
            </div>
          </div>

          <div style={{ marginTop: 8, marginBottom: 10, fontSize: 12.5, fontWeight: 600, color: 'var(--graphite)' }}>Voci (articolo + quantità)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {righe.map((r, i) => (
              <div key={r._key} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select
                  value={r.articolo_id}
                  onChange={e => aggiornaRiga(r._key, 'articolo_id', e.target.value)}
                  style={{ flex: 3, padding: '9px 10px', border: '1px solid var(--line)', borderRadius: 6 }}
                  required
                >
                  <option value="">Seleziona articolo…</option>
                  {articoli.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.tipologia} · {a.colore} · {a.genere} · {a.taglia} ({a.codice})
                    </option>
                  ))}
                </select>
                <input
                  type="number" min="1" value={r.quantita}
                  onChange={e => aggiornaRiga(r._key, 'quantita', e.target.value)}
                  style={{ flex: 1, padding: '9px 10px', border: '1px solid var(--line)', borderRadius: 6 }}
                  required
                />
                <button type="button" className="btn btn-secondary" onClick={() => rimuoviRiga(r._key)} disabled={righe.length === 1}>Rimuovi</button>
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-secondary" onClick={aggiungiRiga} style={{ marginBottom: 16 }}>+ Aggiungi articolo</button>
          <br />
          <button className="btn btn-primary">Registra movimento</button>
        </form>
          </>
        )}
      </div>

      <div className="card">
        <h3>Ultimi movimenti</h3>
        <div className="filter-bar">
          <select value={filtroAzienda} onChange={e => setFiltroAzienda(e.target.value)}>
            <option value="">Tutte le società</option>
            {aziende.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
        </div>
        {loading ? (
          <div className="empty-state">Caricamento…</div>
        ) : gruppi.length === 0 ? (
          <div className="empty-state">Nessun movimento registrato ancora.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {gruppi.map(g => {
              const totale = g.righe.reduce((s, r) => s + r.quantita, 0)
              return (
                <div key={g.chiave} style={{ border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', padding: '10px 14px', background: 'var(--canvas)', borderBottom: '1px solid var(--line)' }}>
                    <span className="mono" style={{ color: 'var(--graphite)' }}>{g.data_mov}</span>
                    <span className={`badge ${g.tipo === 'Carico' ? 'carico' : 'scarico'}`}>{g.tipo}</span>
                    <span style={{ fontSize: 13 }}>{g.azienda || '—'}</span>
                    {g.riferimento && <span className="mono" style={{ fontSize: 12.5, color: 'var(--steel)' }}>{g.riferimento}</span>}
                    <span style={{ marginLeft: 'auto', fontSize: 12.5, color: 'var(--graphite)' }}>{g.righe.length} voce/i — <strong className="mono">{totale}</strong> pezzi totali</span>
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th>Articolo</th>
                        <th style={{ textAlign: 'right' }}>Qtà</th>
                        <th>Note</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.righe.map(m => (
                        inModifica === m.id ? (
                          <tr key={m.id}>
                            <td colSpan={4}>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: '6px 0' }}>
                                <input type="date" value={formModifica.data_mov} onChange={e => setFormModifica(f => ({ ...f, data_mov: e.target.value }))} style={{ padding: '7px 9px', border: '1px solid var(--line)', borderRadius: 6 }} />
                                <select value={formModifica.articolo_id} onChange={e => setFormModifica(f => ({ ...f, articolo_id: e.target.value }))} style={{ padding: '7px 9px', border: '1px solid var(--line)', borderRadius: 6, flex: 2 }}>
                                  {articoli.map(a => (
                                    <option key={a.id} value={a.id}>{a.tipologia} · {a.colore} · {a.genere} · {a.taglia} ({a.codice})</option>
                                  ))}
                                </select>
                                <input type="number" min="1" value={formModifica.quantita} onChange={e => setFormModifica(f => ({ ...f, quantita: e.target.value }))} style={{ width: 70, padding: '7px 9px', border: '1px solid var(--line)', borderRadius: 6 }} />
                                <input type="text" placeholder="Note" value={formModifica.note} onChange={e => setFormModifica(f => ({ ...f, note: e.target.value }))} style={{ flex: 1, minWidth: 100, padding: '7px 9px', border: '1px solid var(--line)', borderRadius: 6 }} />
                                <button type="button" className="btn btn-primary" onClick={() => salvaModifica(m.id)}>Salva</button>
                                <button type="button" className="btn btn-secondary" onClick={() => setInModifica(null)}>Annulla</button>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          <tr key={m.id}>
                            <td>
                              {m.articoli
                                ? <TagChip colore={m.articoli.colore} coloreHex={m.articoli.colore_hex} genere={m.articoli.genere} taglia={m.articoli.taglia} codice={m.articoli.codice} />
                                : '—'}
                              {' '}
                              <span style={{ color: 'var(--graphite)', fontSize: 12.5 }}>{m.articoli?.tipologia}</span>
                            </td>
                            <td className="mono" style={{ textAlign: 'right' }}>{m.quantita}</td>
                            <td style={{ color: 'var(--graphite)' }}>{m.note || '—'}</td>
                            <td style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                              <button className="btn btn-secondary" onClick={() => apriModifica(m)}>Modifica</button>
                              <button className="btn btn-secondary" onClick={() => eliminaRiga(m.id)}>Elimina</button>
                            </td>
                          </tr>
                        )
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
