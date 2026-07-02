import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import TagChip from '../components/TagChip'

const oggi = () => new Date().toISOString().slice(0, 10)
const STATI = ['Consegnato', 'Reso', 'Altro']

export default function Movimenti() {
  const [articoli, setArticoli] = useState([])
  const [dipendenti, setDipendenti] = useState([])
  const [aziende, setAziende] = useState([])
  const [movimenti, setMovimenti] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [filtroAzienda, setFiltroAzienda] = useState('')

  const [form, setForm] = useState({
    data_mov: oggi(), tipo: 'Scarico', articolo_id: '', quantita: 1, dipendente_id: '', azienda_id: '', stato: 'Consegnato', note: '',
  })

  async function loadAll() {
    setLoading(true)
    const [{ data: art }, { data: dip }, { data: az }, { data: mov, error: movErr }] = await Promise.all([
      supabase.from('articoli').select('*').eq('attivo', true).order('tipologia'),
      supabase.from('dipendenti').select('*, sedi(nome, azienda_id)').eq('attivo', true).order('cognome'),
      supabase.from('aziende').select('*').order('nome'),
      supabase.from('movimenti')
        .select('*, articoli(codice, tipologia, colore, genere, taglia), dipendenti(nome, cognome), aziende(nome)')
        .order('data_mov', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(80),
    ])
    setArticoli(art || [])
    setDipendenti(dip || [])
    setAziende(az || [])
    if (movErr) setError(movErr.message)
    setMovimenti(mov || [])
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  function updateField(k, v) {
    setForm(f => ({ ...f, [k]: v }))
  }

  // Se è uno scarico e il dipendente è collegato a una sede con società nota,
  // la società si deduce automaticamente (non serve selezionarla a mano).
  const dipendenteSelezionato = dipendenti.find(d => d.id === form.dipendente_id)
  const aziendaDedotta = form.tipo === 'Scarico' ? dipendenteSelezionato?.sedi?.azienda_id : null
  const aziendaDedottaNome = aziendaDedotta ? aziende.find(a => a.id === aziendaDedotta)?.nome : null

  useEffect(() => {
    if (form.tipo === 'Scarico' && aziendaDedotta) {
      setForm(f => (f.azienda_id === aziendaDedotta ? f : { ...f, azienda_id: aziendaDedotta }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aziendaDedotta, form.tipo])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!form.articolo_id) return setError('Seleziona un articolo.')
    if (!form.azienda_id) return setError('Seleziona la società.')
    if (form.tipo === 'Scarico' && !form.dipendente_id) return setError('Per uno scarico devi indicare il dipendente.')

    const { data: userData } = await supabase.auth.getUser()

    const payload = {
      data_mov: form.data_mov,
      tipo: form.tipo,
      articolo_id: form.articolo_id,
      azienda_id: form.azienda_id,
      quantita: Number(form.quantita),
      dipendente_id: form.tipo === 'Scarico' ? form.dipendente_id : (form.dipendente_id || null),
      stato: form.tipo === 'Scarico' ? form.stato : null,
      note: form.note || null,
      creato_da: userData?.user?.id || null,
    }

    const { error } = await supabase.from('movimenti').insert(payload)
    if (error) {
      setError(error.message.includes('Giacenza insufficiente') ? error.message : `Errore: ${error.message}`)
      return
    }
    setSuccess('Movimento registrato correttamente.')
    setForm(f => ({ ...f, quantita: 1, note: '', stato: 'Consegnato' }))
    loadAll()
  }

  const movimentiFiltrati = filtroAzienda ? movimenti.filter(m => m.azienda_id === filtroAzienda) : movimenti

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Movimenti</h2>
          <p className="sub">Registra un carico (arrivo dal fornitore) o uno scarico (assegnazione). Per gli scarichi la società si deduce automaticamente dalla sede del dipendente.</p>
        </div>
      </div>

      <div className="card">
        <h3>Nuovo movimento</h3>
        {error && <div className="alert error">{error}</div>}
        {success && <div className="alert success">{success}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field">
              <label>Data</label>
              <input type="date" value={form.data_mov} onChange={e => updateField('data_mov', e.target.value)} required />
            </div>
            <div className="field">
              <label>Tipo movimento</label>
              <select value={form.tipo} onChange={e => updateField('tipo', e.target.value)}>
                <option>Scarico</option>
                <option>Carico</option>
              </select>
            </div>

            {form.tipo === 'Carico' || !aziendaDedotta ? (
              <div className="field" style={{ gridColumn: 'span 2' }}>
                <label>Società {form.tipo === 'Scarico' && form.dipendente_id && '(la sede di questo dipendente non è ancora collegata a una società — selezionala qui, oppure collegala una volta per tutte in Dipendenti > Gestisci sedi)'}</label>
                <select value={form.azienda_id} onChange={e => updateField('azienda_id', e.target.value)} required>
                  <option value="">Seleziona società…</option>
                  {aziende.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
              </div>
            ) : (
              <div className="field" style={{ gridColumn: 'span 2' }}>
                <label>Società (dedotta automaticamente dalla sede)</label>
                <input type="text" value={aziendaDedottaNome || ''} disabled className="mono" />
              </div>
            )}

            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label>Articolo</label>
              <select value={form.articolo_id} onChange={e => updateField('articolo_id', e.target.value)} required>
                <option value="">Seleziona articolo…</option>
                {articoli.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.tipologia} · {a.colore} · {a.genere} · {a.taglia} ({a.codice})
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Quantità</label>
              <input type="number" min="1" value={form.quantita} onChange={e => updateField('quantita', e.target.value)} required />
            </div>
            <div className="field">
              <label>Dipendente {form.tipo === 'Scarico' && '(obbligatorio)'}</label>
              <select value={form.dipendente_id} onChange={e => updateField('dipendente_id', e.target.value)}>
                <option value="">{form.tipo === 'Carico' ? '— non applicabile —' : 'Seleziona dipendente…'}</option>
                {dipendenti.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.cognome} {d.nome} — {d.sedi?.nome || 'senza sede'}
                  </option>
                ))}
              </select>
            </div>
            {form.tipo === 'Scarico' && (
              <div className="field">
                <label>Stato</label>
                <select value={form.stato} onChange={e => updateField('stato', e.target.value)}>
                  {STATI.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label>Note</label>
              <input type="text" placeholder="Es. Ordine fornitore X / Sostituzione per usura" value={form.note} onChange={e => updateField('note', e.target.value)} />
            </div>
          </div>
          <button className="btn btn-primary">Registra movimento</button>
        </form>
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
        ) : movimentiFiltrati.length === 0 ? (
          <div className="empty-state">Nessun movimento registrato ancora.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Società</th>
                <th>Articolo</th>
                <th>Qtà</th>
                <th>Dipendente</th>
                <th>Stato</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {movimentiFiltrati.map(m => (
                <tr key={m.id}>
                  <td className="mono">{m.data_mov}</td>
                  <td><span className={`badge ${m.tipo === 'Carico' ? 'carico' : 'scarico'}`}>{m.tipo}</span></td>
                  <td style={{ fontSize: 12.5 }}>{m.aziende?.nome || '—'}</td>
                  <td>
                    {m.articoli
                      ? <TagChip colore={m.articoli.colore} genere={m.articoli.genere} taglia={m.articoli.taglia} codice={m.articoli.codice} />
                      : '—'}
                    {' '}
                    <span style={{ color: 'var(--graphite)', fontSize: 12.5 }}>{m.articoli?.tipologia}</span>
                  </td>
                  <td className="mono">{m.quantita}</td>
                  <td>{m.dipendenti ? `${m.dipendenti.cognome} ${m.dipendenti.nome}` : '—'}</td>
                  <td>{m.stato ? <span className={`badge ${m.stato === 'Reso' ? 'low' : 'ok'}`}>{m.stato}</span> : '—'}</td>
                  <td style={{ color: 'var(--graphite)' }}>{m.note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
