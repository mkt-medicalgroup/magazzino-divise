import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import TagChip from '../components/TagChip'
import { PALETTE_COLORI } from '../lib/colori'

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
  const [colorePersonalizzato, setColorePersonalizzato] = useState(false)

  const vuoto = { tipologia: 'Casacca', colore: '', colore_hex: '', genere: 'Uomo', taglia: '', soglia_min: 5 }
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

  function selezionaColore(c) {
    setForm(f => ({ ...f, colore: c.nome, colore_hex: c.hex }))
    setColorePersonalizzato(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!form.colore.trim() || !form.taglia.trim()) return setError('Colore e taglia sono obbligatori.')

    const codice = generaCodice(form)
    const { error } = await supabase.from('articoli').insert({
      tipologia: form.tipologia,
      colore: form.colore.trim(),
      colore_hex: form.colore_hex || null,
      genere: form.genere,
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
    setColorePersonalizzato(false)
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
          </div>

          <div className="field" style={{ marginTop: 4 }}>
            <label>Colore {form.colore && <span style={{ color: 'var(--graphite)', fontWeight: 400 }}>— selezionato: {form.colore}</span>}</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              {PALETTE_COLORI.map(c => {
                const attivo = form.colore === c.nome && !colorePersonalizzato
                return (
                  <button
                    type="button"
                    key={c.nome}
                    onClick={() => selezionaColore(c)}
                    title={c.nome}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '5px 10px 5px 6px', borderRadius: 20,
                      border: attivo ? '2px solid var(--steel)' : '1px solid var(--line)',
                      background: attivo ? '#EAF1F5' : 'var(--paper)',
                      fontSize: 12.5, cursor: 'pointer',
                    }}
                  >
                    <span style={{ width: 16, height: 16, borderRadius: '50%', background: c.hex, border: '1px solid rgba(0,0,0,0.15)' }} />
                    {c.codice && <span className="mono" style={{ color: 'var(--graphite)', fontSize: 11 }}>{c.codice}</span>}
                    {c.nome}
                  </button>
                )
              })}
              <button
                type="button"
                onClick={() => setColorePersonalizzato(true)}
                style={{
                  padding: '5px 10px', borderRadius: 20,
                  border: colorePersonalizzato ? '2px solid var(--steel)' : '1px dashed var(--line)',
                  background: colorePersonalizzato ? '#EAF1F5' : 'var(--paper)',
                  fontSize: 12.5, cursor: 'pointer', color: 'var(--graphite)',
                }}
              >
                + Colore personalizzato…
              </button>
            </div>

            {colorePersonalizzato && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginTop: 10 }}>
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label>Nome colore</label>
                  <input type="text" placeholder="es. Verde bosco" value={form.colore} onChange={e => updateField('colore', e.target.value)} />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Tonalità esatta</label>
                  <input type="color" value={form.colore_hex || '#B8B4A6'} onChange={e => updateField('colore_hex', e.target.value)} style={{ width: 48, height: 36, padding: 2 }} />
                </div>
              </div>
            )}
          </div>

          <div className="field" style={{ marginTop: 14 }}>
            <label>Codice generato</label>
            <input type="text" className="mono" value={generaCodice(form) || '—'} disabled style={{ maxWidth: 220 }} />
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
                  <td><TagChip colore={a.colore} coloreHex={a.colore_hex} genere={a.genere} taglia={a.taglia} codice={a.codice} /></td>
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
