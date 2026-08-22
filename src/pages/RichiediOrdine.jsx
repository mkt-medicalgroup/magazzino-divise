import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const nuovaRiga = () => ({ _key: crypto.randomUUID(), articolo_id: '', quantita: 1 })

export default function RichiediOrdine() {
  const [articoli, setArticoli] = useState([])
  const [dipendenti, setDipendenti] = useState([])
  const [sedi, setSedi] = useState([])
  const [caricamento, setCaricamento] = useState(true)
  const [errore, setErrore] = useState('')
  const [inviato, setInviato] = useState(false)
  const [invioInCorso, setInvioInCorso] = useState(false)

  const [modalitaDipendente, setModalitaDipendente] = useState('esistente') // 'esistente' | 'nuovo'
  const [dipendenteId, setDipendenteId] = useState('')
  const [nuovoNome, setNuovoNome] = useState('')
  const [nuovoCognome, setNuovoCognome] = useState('')
  const [sedeId, setSedeId] = useState('')
  const [richiedente, setRichiedente] = useState('')
  const [note, setNote] = useState('')
  const [righe, setRighe] = useState([nuovaRiga()])

  useEffect(() => {
    async function carica() {
      setCaricamento(true)
      const [{ data: art, error: artErr }, { data: dip }, { data: sd }] = await Promise.all([
        supabase.from('articoli').select('*').eq('attivo', true).order('tipologia'),
        supabase.from('dipendenti').select('id, nome, cognome, sede_id').eq('attivo', true).order('cognome'),
        supabase.from('sedi').select('*').order('nome'),
      ])
      if (artErr) setErrore('Non riesco a caricare il modulo. Riprova tra poco o contatta chi ti ha inviato il link.')
      setArticoli(art || [])
      setDipendenti(dip || [])
      setSedi(sd || [])
      setCaricamento(false)
    }
    carica()
  }, [])

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
    setErrore('')

    if (modalitaDipendente === 'esistente' && !dipendenteId) return setErrore('Seleziona il dipendente.')
    if (modalitaDipendente === 'nuovo' && (!nuovoNome.trim() || !nuovoCognome.trim())) return setErrore('Inserisci nome e cognome del nuovo assunto.')
    if (modalitaDipendente === 'nuovo' && !sedeId) return setErrore('Seleziona la sede del nuovo assunto.')
    const righeValide = righe.filter(r => r.articolo_id && Number(r.quantita) > 0)
    if (righeValide.length === 0) return setErrore('Aggiungi almeno un articolo con quantità valida.')

    setInvioInCorso(true)
    const richiestaId = crypto.randomUUID()

    const { error: errHeader } = await supabase.from('richieste_ordini').insert({
      id: richiestaId,
      dipendente_id: modalitaDipendente === 'esistente' ? dipendenteId : null,
      nuovo_nome: modalitaDipendente === 'nuovo' ? nuovoNome.trim() : null,
      nuovo_cognome: modalitaDipendente === 'nuovo' ? nuovoCognome.trim() : null,
      sede_id: modalitaDipendente === 'nuovo' ? sedeId : (dipendenti.find(d => d.id === dipendenteId)?.sede_id || null),
      richiedente: richiedente.trim() || null,
      note: note.trim() || null,
    })

    if (errHeader) {
      setInvioInCorso(false)
      setErrore(`Non sono riuscito a inviare la richiesta: ${errHeader.message}`)
      return
    }

    const { error: errRighe } = await supabase.from('richieste_ordini_righe').insert(
      righeValide.map(r => ({ richiesta_id: richiestaId, articolo_id: r.articolo_id, quantita: Number(r.quantita) }))
    )

    setInvioInCorso(false)
    if (errRighe) {
      setErrore(`La richiesta è stata creata ma alcuni articoli non sono stati salvati: ${errRighe.message}`)
      return
    }

    setInviato(true)
  }

  if (caricamento) {
    return (
      <div className="login-screen">
        <div className="login-card" style={{ textAlign: 'center', color: 'var(--graphite)' }}>Caricamento…</div>
      </div>
    )
  }

  if (inviato) {
    return (
      <div className="login-screen">
        <div className="login-card" style={{ width: 380 }}>
          <span className="tag">MAGAZZINO</span>
          <h1>Richiesta inviata</h1>
          <p style={{ color: 'var(--graphite)', fontSize: 14, lineHeight: 1.5 }}>
            La tua richiesta d'ordine è stata inviata correttamente. Verrà presa in carico a breve.
          </p>
          <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={() => {
            setInviato(false)
            setDipendenteId(''); setNuovoNome(''); setNuovoCognome(''); setSedeId('')
            setRichiedente(''); setNote(''); setRighe([nuovaRiga()])
            setModalitaDipendente('esistente')
          }}>
            Invia un'altra richiesta
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="login-screen" style={{ alignItems: 'flex-start', padding: '40px 16px' }}>
      <div className="login-card" style={{ width: '100%', maxWidth: 640, margin: '0 auto' }}>
        <span className="tag">MAGAZZINO</span>
        <h1>Richiedi divise per un dipendente</h1>

        {errore && <div className="alert error">{errore}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Dipendente</label>
            <div style={{ display: 'flex', gap: 14, marginBottom: 8, fontSize: 13 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="radio" checked={modalitaDipendente === 'esistente'} onChange={() => setModalitaDipendente('esistente')} />
                Già in anagrafica
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="radio" checked={modalitaDipendente === 'nuovo'} onChange={() => setModalitaDipendente('nuovo')} />
                Nuovo assunto (non ancora in anagrafica)
              </label>
            </div>
          </div>

          {modalitaDipendente === 'esistente' ? (
            <div className="field">
              <label>Seleziona dipendente</label>
              <select value={dipendenteId} onChange={e => setDipendenteId(e.target.value)} required>
                <option value="">Seleziona…</option>
                {dipendenti.map(d => <option key={d.id} value={d.id}>{d.cognome} {d.nome}</option>)}
              </select>
            </div>
          ) : (
            <div className="form-grid">
              <div className="field">
                <label>Nome</label>
                <input type="text" value={nuovoNome} onChange={e => setNuovoNome(e.target.value)} required />
              </div>
              <div className="field">
                <label>Cognome</label>
                <input type="text" value={nuovoCognome} onChange={e => setNuovoCognome(e.target.value)} required />
              </div>
              <div className="field" style={{ gridColumn: 'span 2' }}>
                <label>Sede</label>
                <select value={sedeId} onChange={e => setSedeId(e.target.value)} required>
                  <option value="">Seleziona sede…</option>
                  {sedi.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              </div>
            </div>
          )}

          <div style={{ marginTop: 10, marginBottom: 10, fontSize: 12.5, fontWeight: 600, color: 'var(--graphite)' }}>Articoli richiesti</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {righe.map(r => (
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
                      {a.tipologia} · {a.colore} · {a.genere} · {a.taglia}
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

          <div className="field">
            <label>Il tuo nome (facoltativo, così sappiamo chi ha fatto la richiesta)</label>
            <input type="text" value={richiedente} onChange={e => setRichiedente(e.target.value)} />
          </div>
          <div className="field">
            <label>Note (facoltativo)</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)} />
          </div>

          <button className="btn btn-primary" disabled={invioInCorso} style={{ width: '100%', justifyContent: 'center' }}>
            {invioInCorso ? 'Invio in corso…' : 'Invia richiesta'}
          </button>
        </form>
      </div>
    </div>
  )
}
