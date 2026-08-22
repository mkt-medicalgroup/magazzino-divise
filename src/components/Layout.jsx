import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../supabaseClient'
import Giacenze from '../pages/Giacenze'
import Movimenti from '../pages/Movimenti'
import Articoli from '../pages/Articoli'
import Dipendenti from '../pages/Dipendenti'
import Richieste from '../pages/Richieste'

const SEZIONI_VALIDE = ['giacenze', 'movimenti', 'articoli', 'dipendenti', 'richieste']

export default function Layout() {
  const { session, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [notificheTotali, setNotificheTotali] = useState(0)

  const sezioneCorrente = location.pathname.replace(/^\//, '') || 'giacenze'
  const sezione = SEZIONI_VALIDE.includes(sezioneCorrente) ? sezioneCorrente : 'giacenze'

  useEffect(() => {
    if (!SEZIONI_VALIDE.includes(sezioneCorrente)) {
      navigate('/giacenze', { replace: true })
    }
  }, [sezioneCorrente, navigate])

  async function caricaNotifiche() {
    const { count } = await supabase.from('notifiche').select('id', { count: 'exact', head: true }).eq('letta', false)
    setNotificheTotali(count || 0)
  }

  useEffect(() => {
    caricaNotifiche()
    const intervallo = setInterval(caricaNotifiche, 30000) // ricontrolla ogni 30 secondi
    return () => clearInterval(intervallo)
  }, [])

  // Quando si entra nella pagina Richieste, le notifiche vengono segnate
  // come lette (gestito nelle pagine RichiesteOrdini/RichiesteScarico):
  // ricontrolliamo il contatore appena si cambia sezione.
  useEffect(() => { caricaNotifiche() }, [sezione])

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="tag">MAGAZZINO</span>
          <h1>Divise dipendenti</h1>
        </div>
        <nav>
          <NavLink to="/giacenze" className={({ isActive }) => isActive ? 'active' : ''}>Giacenze</NavLink>
          <NavLink to="/movimenti" className={({ isActive }) => isActive ? 'active' : ''}>Movimenti</NavLink>
          <NavLink to="/articoli" className={({ isActive }) => isActive ? 'active' : ''}>Catalogo articoli</NavLink>
          <NavLink to="/dipendenti" className={({ isActive }) => isActive ? 'active' : ''}>Dipendenti</NavLink>
          <NavLink to="/richieste" className={({ isActive }) => isActive ? 'active' : ''} style={{ justifyContent: 'space-between' }}>
            <span>Richieste</span>
            {notificheTotali > 0 && (
              <span style={{ background: 'var(--orange)', color: '#fff', borderRadius: 999, fontSize: 11, fontWeight: 700, padding: '1px 7px' }}>
                {notificheTotali}
              </span>
            )}
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <div style={{ marginBottom: 8, color: '#9CA9B8', fontSize: 12 }} className="mono">
            {session?.user?.email}
          </div>
          <button onClick={signOut}>Esci</button>
        </div>
      </aside>
      <main className="main">
        {/* Le pagine restano sempre montate: passando da una all'altra
            si nasconde/mostra con CSS, senza perdere ciò che stavi scrivendo. */}
        <div style={{ display: sezione === 'giacenze' ? 'block' : 'none' }}><Giacenze /></div>
        <div style={{ display: sezione === 'movimenti' ? 'block' : 'none' }}><Movimenti /></div>
        <div style={{ display: sezione === 'articoli' ? 'block' : 'none' }}><Articoli /></div>
        <div style={{ display: sezione === 'dipendenti' ? 'block' : 'none' }}><Dipendenti /></div>
        <div style={{ display: sezione === 'richieste' ? 'block' : 'none' }}><Richieste /></div>
      </main>
    </div>
  )
}
