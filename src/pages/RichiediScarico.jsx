import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'

const nuovaRiga = () => ({ _key: crypto.randomUUID(), articolo_id: '', quantita: 1 })

export default function RichiediScarico() {
  const [articoli, setArticoli] = useState([])
  const [dipendenti, setDipendenti] = useState([])
  const [caricamento, setCaricamento] = useState(true)
  const [errore, setErrore] = useState('')
  const [inviato, setInviato] = useState(false)
  const [invioInCorso, setInvioInCorso] = useState(false)

  const [dipendenteId, setDipendenteId] = useState('')
  const [assegnazioniAttuali, setAssegnazioniAttuali] = useState(null)
  const [richiedente, setRichiedente] = useState('')
  const [note, setNote] = useState('')
  const [righe, setRighe] = useState([nuovaRiga()])

  useEffect(() => {
    async function carica() {
      setCaricamento(true)
      const [{ data: art, error: artErr }, { data: dip }] = await Promise.all([
        supabase.from('articoli').select('*').eq('attivo', true).order('tipologia'),
        supabase.from('dipendenti').select('id, nome, cognome, sede_id, sedi(nome)').eq('attivo', true).order('cognome'),
      ])
      if (artErr) setErrore('Non riesco a caricare il modulo. Riprova tra poco o contatta chi ti ha inviato il link.')
      setArticoli(art || [])
      setDipendenti(dip || [])
      setCaricamento(false)
    }
    carica()
  }, [])

  useEffect(() => {
    async function caricaAssegnazioni() {
      if (!dipendenteId) { setAssegnazioniAttuali(null); return }
      const { data } = await supabase
        .from('assegnazioni')
        .select('quantita, stato, articoli(tipologia, colore, genere, taglia)')
        .eq('dipendente_id', dipendenteId)
      const attive = (data || []).filter(a => (a.stato || 'Consegnato') !== 'Reso')
      setAssegnazioniAttuali(attive)
    }
    caricaAssegnazioni()
  }, [dipendenteId])

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

    if (!dipendenteId) return setErrore('Seleziona il dipendente.')
    const righeValide = righe.filter(r => r.articolo_id && Number(r.quantita) > 0)
    if (righeValide.length === 0) return setErrore('Aggiungi almeno un articolo con quantità valida.')

    const dipendente = dipendenti.find(d => d.id === dipendenteId)

    setInvioInCorso(true)
    const richiestaId = crypto.randomUUID()

    const { error: errHeader } = await supabase.from('richieste_scarico').insert({
      id: richiestaId,
      dipendente_id: dipendenteId,
      sede_id: dipendente?.sede_id || null,
      richiedente: richiedente.trim() || null,
      note: note.trim() || null,
    })

    if (errHeader) {
      setInvioInCorso(false)
      setErrore(`Non sono riuscito a inviare la segnalazione: ${errHeader.message}`)
      return
    }

    const { error: errRighe } = await supabase.from('richieste_scarico_righe').insert(
      righeValide.map(r => ({ richiesta_id: richiestaId, articolo_id: r.articolo_id, quantita: Number(r.quantita) }))
    )

    setInvioInCorso(false)
    if (errRighe) {
      setErrore(`La segnalazione è stata creata ma alcuni articoli non sono stati salvati: ${errRighe.message}`)
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
          <h1>Segnalazione inviata</h1>
          <p style={{ color: 'var(--graphite)', fontSize: 14, lineHeight: 1.5 }}>
            La restituzione è stata segnalata correttamente. Verrà presa in carico a breve.
          </p>
          <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={() => {
            setInviato(false)
            setDipendenteId(''); setRichiedente(''); setNote(''); setRighe([nuovaRiga()])
          }}>
            Invia un'altra segnalazione
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="login-screen" style={{ alignItems: 'flex-start', padding: '40px 16px' }}>
      <div className="login-card" style={{ width: '100%', maxWidth: 640, margin: '0 auto' }}>
        <span className="tag">MAGAZZINO</span>
        <h1>Segnala divise restituite</h1>
        <p style={{ color: 'var(--graphite)', fontSize: 13.5, marginTop: -12, marginBottom: 20 }}>
          Usa questo modulo quando un dipendente lascia l'azienda (o cambia ruolo) e restituisce le divise assegnate.
        </p>

        {errore && <div className="alert error">{errore}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Dipendente</label>
            <select value={dipendenteId} onChange={e => setDipendenteId(e.target.value)} required>
              <option value="">Seleziona…</option>
              {dipendenti.map(d => <option key={d.id} value={d.id}>{d.cognome} {d.nome} — {d.sedi?.nome || 'senza sede'}</option>)}
            </select>
          </div>

          {assegnazioniAttuali && assegnazioniAttuali.length > 0 && (
            <div style={{ background: 'var(--canvas)', border: '1px solid var(--line)', borderRadius: 8, padding: '10px 12px', marginBottom: 16, fontSize: 13 }}>
              <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--graphite)' }}>Divise attualmente risultanti a questo dipendente:</div>
              {assegnazioniAttuali.map((a, i) => (
                <div key={i} style={{ color: 'var(--graphite)' }}>
                  {a.articoli?.tipologia} · {a.articoli?.colore} · {a.articoli?.genere} · {a.articoli?.taglia} — ×{a.quantita}
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 10, marginBottom: 10, fontSize: 12.5, fontWeight: 600, color: 'var(--graphite)' }}>Articoli restituiti</div>
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
            <label>Il tuo nome (facoltativo, così sappiamo chi ha fatto la segnalazione)</label>
            <input type="text" value={richiedente} onChange={e => setRichiedente(e.target.value)} />
          </div>
          <div className="field">
            <label>Note (facoltativo)</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)} />
          </div>

          <button className="btn btn-primary" disabled={invioInCorso} style={{ width: '100%', justifyContent: 'center' }}>
            {invioInCorso ? 'Invio in corso…' : 'Invia segnalazione'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Link to="/richiedi-ordine" style={{ fontSize: 12.5, color: 'var(--steel)' }}>Devi invece richiedere delle divise? Vai al modulo ordini →</Link>
        </div>
      </div>
    </div>
  )
}
