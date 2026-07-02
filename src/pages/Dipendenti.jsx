import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import TagChip from '../components/TagChip'

export default function Dipendenti() {
  const [dipendenti, setDipendenti] = useState([])
  const [sedi, setSedi] = useState([])
  const [ruoli, setRuoli] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [filtroSede, setFiltroSede] = useState('')
  const [aperto, setAperto] = useState(null)
  const [storico, setStorico] = useState({})

  const vuoto = { nome: '', cognome: '', sede_id: '', ruolo_id: '' }
  const [form, setForm] = useState(vuoto)
  const [nuovaSede, setNuovaSede] = useState('')
  const [nuovoRuolo, setNuovoRuolo] = useState('')

  async function load() {
    setLoading(true)
    const [{ data: dip, error: dipErr }, { data: sd }, { data: rl }] = await Promise.all([
      supabase.from('dipendenti').select('*, sedi(nome), ruoli(nome)').eq('attivo', true).order('cognome'),
      supabase.from('sedi').select('*').order('nome'),
      supabase.from('ruoli').select('*').order('nome'),
    ])
    if (dipErr) setError(dipErr.message)
    setDipendenti(dip || [])
    setSedi(sd || [])
    setRuoli(rl || [])
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

  async function aggiungiSede(e) {
    e.preventDefault()
    if (!nuovaSede.trim()) return
    const { error } = await supabase.from('sedi').insert({ nome: nuovaSede.trim() })
    if (!error) { setNuovaSede(''); load() }
  }

  async function aggiungiRuolo(e) {
    e.preventDefault()
    if (!nuovoRuolo.trim()) return
    const { error } = await supabase.from('ruoli').insert({ nome: nuovoRuolo.trim() })
    if (!error) { setNuovoRuolo(''); load() }
  }

  async function disattiva(id) {
    if (!confirm('Disattivare questo dipendente? Lo storico movimenti resterà comunque visibile.')) return
    await supabase.from('dipendenti').update({ attivo: false }).eq('id', id)
    load()
  }

  async function toggleStorico(id) {
    if (aperto === id) { setAperto(null); return }
    setAperto(id)
    if (!storico[id]) {
      const { data } = await supabase.from('movimenti')
        .select('*, articoli(codice, tipologia, colore, genere, taglia), aziende(nome)')
        .eq('dipendente_id', id)
        .order('data_mov', { ascending: false })
      setStorico(s => ({ ...s, [id]: data || [] }))
    }
  }

  const filtrati = filtroSede ? dipendenti.filter(d => d.sede_id === filtroSede) : dipendenti

  const gruppi = filtrati.reduce((acc, d) => {
    const nomeSede = d.sedi?.nome || 'Senza sede'
    acc[nomeSede] = acc[nomeSede] || []
    acc[nomeSede].push(d)
    return acc
  }, {})

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Dipendenti</h2>
          <p className="sub">Elenco dipendenti diviso per sede, con ruolo e storico divise assegnate.</p>
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
                {sedi.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
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
          <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--graphite)' }}>Gestisci sedi e ruoli</summary>
          <div style={{ display: 'flex', gap: 24, marginTop: 12, flexWrap: 'wrap' }}>
            <form onSubmit={aggiungiSede} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Nuova sede</label>
                <input value={nuovaSede} onChange={e => setNuovaSede(e.target.value)} placeholder="es. Filiale Est" />
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
        </details>
      </div>

      <div className="filter-bar">
        <select value={filtroSede} onChange={e => setFiltroSede(e.target.value)}>
          <option value="">Tutte le sedi</option>
          {sedi.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="card"><div className="empty-state">Caricamento…</div></div>
      ) : Object.keys(gruppi).length === 0 ? (
        <div className="card"><div className="empty-state">Nessun dipendente trovato.</div></div>
      ) : (
        Object.entries(gruppi).map(([nomeSede, lista]) => (
          <div className="card" key={nomeSede}>
            <h3>{nomeSede} — {lista.length} dipendenti</h3>
            <table>
              <thead>
                <tr>
                  <th>Cognome e nome</th>
                  <th>Ruolo</th>
                  <th></th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lista.map(d => (
                  <>
                    <tr key={d.id}>
                      <td>{d.cognome} {d.nome}</td>
                      <td style={{ color: 'var(--graphite)' }}>{d.ruoli?.nome || '—'}</td>
                      <td><button className="btn btn-secondary" onClick={() => toggleStorico(d.id)}>{aperto === d.id ? 'Nascondi storico' : 'Vedi divise assegnate'}</button></td>
                      <td><button className="btn btn-secondary" onClick={() => disattiva(d.id)}>Disattiva</button></td>
                    </tr>
                    {aperto === d.id && (
                      <tr>
                        <td colSpan={4} style={{ background: 'var(--canvas)' }}>
                          {!storico[d.id] ? (
                            <span style={{ color: 'var(--graphite)' }}>Caricamento…</span>
                          ) : storico[d.id].length === 0 ? (
                            <span style={{ color: 'var(--graphite)' }}>Nessuna divisa assegnata finora.</span>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '6px 0' }}>
                              {storico[d.id].filter(m => m.tipo === 'Scarico').map(m => (
                                <div key={m.id} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13, flexWrap: 'wrap' }}>
                                  <span className="mono" style={{ color: 'var(--graphite)', width: 90 }}>{m.data_mov}</span>
                                  {m.articoli && <TagChip colore={m.articoli.colore} genere={m.articoli.genere} taglia={m.articoli.taglia} codice={m.articoli.codice} />}
                                  <span>{m.articoli?.tipologia}</span>
                                  <span className="mono">×{m.quantita}</span>
                                  {m.aziende && <span style={{ color: 'var(--steel)', fontSize: 12 }}>{m.aziende.nome}</span>}
                                  {m.note && <span style={{ color: 'var(--graphite)' }}>— {m.note}</span>}
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
