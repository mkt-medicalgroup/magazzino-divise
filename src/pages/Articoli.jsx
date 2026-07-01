import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import TagChip from '../components/TagChip'

const PREFISSO = { Pantaloni: 'PAN', Casacca: 'CAS', Camice: 'CAM' }
const GEN_LETTERA = { Uomo: 'U', Donna: 'D', Unisex: 'X' }

function generaCodice({ tipologia, colore, genere, taglia }) {
  if (!tipologia || !colore || !genere || !taglia) return ''
  const coloreCod = colore.slice(0, 3).toUpperCase()
  return `${PREFISSO[tipologia]}-${coloreCod}-${GEN_LETTERA[genere]}-${taglia.toUpperCase()}`
}

export default function Articoli() {
  const [articoli, setArticoli] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const vuoto = { tipologia: 'Casacca', colore: '', genere: 'Uomo', taglia: '', soglia_min: 5 }
  const [form, setForm] = useState(vuoto)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('articoli').select('*').eq('attivo', true).order('tipologia').order('colore')
    if (error) setError(error.message)
    else setArticoli(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function updateField(k, v) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!form.colore.trim() || !form.taglia.trim()) return setError('Colore e taglia sono obbligatori.')

    const codice = generaCodice(form)
    const { error } = await supabase.from('articoli').insert({
      ...form,
      colore: form.colore.trim(),
      taglia: form.taglia.trim().toUpperCase(),
      soglia_min: Number(form.soglia_min) || 0,
      codice,
    })
    if (error) {
      setError(error.code === '23505' ? 'Questa combinazione (tipologia/colore/genere/taglia) esiste già.' : error.message)
      return
    }
    setSuccess(`Articolo ${codice} creato.`)
    setForm(vuoto)
    load()
  }

  async function disattiva(id) {
    if (!confirm('Disattivare questo articolo? Non sarà più selezionabile nei movimenti (i movimenti storici restano).')) return
    await supabase.from('articoli').update({ attivo: false }).eq('id', id)
    load()
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Catalogo articoli</h2>
          <p className="sub">Ogni combinazione tipologia · colore · genere · taglia è un articolo unico.</p>
        </div>
      </div>

      <div className="card">
        <h3>Nuovo articolo</h3>
        {error && <div className="alert error">{error}</div>}
        {success && <div className="alert success">{success}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field">
              <label>Tipologia</label>
              <select value={form.tipologia} onChange={e => updateField('tipologia', e.target.value)}>
                <option>Pantaloni</option>
                <option>Casacca</option>
                <option>Camice</option>
              </select>
            </div>
            <div className="field">
              <label>Colore</label>
              <input type="text" placeholder="es. Blu" value={form.colore} onChange={e => updateField('colore', e.target.value)} required />
            </div>
            <div className="field">
              <label>Genere</label>
              <select value={form.genere} onChange={e => updateField('genere', e.target.value)}>
                <option>Uomo</option>
                <option>Donna</option>
                <option>Unisex</option>
              </select>
            </div>
            <div className="field">
              <label>Taglia</label>
              <input type="text" placeholder="es. M" value={form.taglia} onChange={e => updateField('taglia', e.target.value)} required />
            </div>
            <div className="field">
              <label>Soglia scorta minima</label>
              <input type="number" min="0" value={form.soglia_min} onChange={e => updateField('soglia_min', e.target.value)} />
            </div>
            <div className="field">
              <label>Codice generato</label>
              <input type="text" className="mono" value={generaCodice(form) || '—'} disabled />
            </div>
          </div>
          <button className="btn btn-primary">Aggiungi al catalogo</button>
        </form>
      </div>

      <div className="card">
        <h3>{articoli.length} articoli attivi</h3>
        {loading ? (
          <div className="empty-state">Caricamento…</div>
        ) : articoli.length === 0 ? (
          <div className="empty-state">Nessun articolo nel catalogo. Aggiungine uno sopra.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Articolo</th>
                <th>Tipologia</th>
                <th>Codice</th>
                <th>Soglia minima</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {articoli.map(a => (
                <tr key={a.id}>
                  <td><TagChip colore={a.colore} genere={a.genere} taglia={a.taglia} codice={a.codice} /></td>
                  <td>{a.tipologia}</td>
                  <td className="mono" style={{ color: 'var(--graphite)' }}>{a.codice}</td>
                  <td className="mono">{a.soglia_min}</td>
                  <td><button className="btn btn-secondary" onClick={() => disattiva(a.id)}>Disattiva</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
