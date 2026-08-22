import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../supabaseClient'
import Giacenze from '../pages/Giacenze'
import Movimenti from '../pages/Movimenti'
import Articoli from '../pages/Articoli'
import Dipendenti from '../pages/Dipendenti'
import RichiesteOrdini from '../pages/RichiesteOrdini'
import RichiesteScarico from '../pages/RichiesteScarico'

const SEZIONI_VALIDE = ['giacenze', 'movimenti', 'articoli', 'dipendenti', 'richieste-ordini', 'richieste-scarico']

export default function Layout() {
  const { session, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [notificheOrdini, setNotificheOrdini] = useState(0)
  const [notificheScarico, setNotificheScarico] = useState(0)

  const sezioneCorrente = location.pathname.replace(/^\//, '') || 'giacenze'
  const sezione = SEZIONI_VALIDE.includes(sezioneCorrente) ? sezioneCorrente : 'giacenze'

  useEffect(() => {
    if (!SEZIONI_VALIDE.includes(sezioneCorrente)) {
      navigate('/giacenze', { replace: true })
    }
  }, [sezioneCorrente, navigate])

  async function caricaNotifiche() {
    const [{ count: ordini }, { count: scarico }] = await Promise.all([
      supabase.from('notifiche').select('id', { count: 'exact', head: true }).eq('letta', false).eq('tipo', 'ordine'),
      supabase.from('notifiche').select('id', { count: 'exact', head: true }).eq('letta', false).eq('tipo', 'scarico'),
    ])
    setNotificheOrdini(ordini || 0)
    setNotificheScarico(scarico || 0)
  }

  useEffect(() => {
    caricaNotifiche()
    const intervallo = setInterval(caricaNotifiche, 30000) // ricontrolla ogni 30 secondi
    return () => clearInterval(intervallo)
  }, [])

  // Quando si entra in una delle due pagine Richieste, le relative notifiche
  // vengono segnate come lette (gestito nelle pagine stesse): ricontrolliamo
  // il contatore appena si cambia sezione.
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

          <div style={{ marginTop: 14, marginBottom: 4, padding: '0 12px', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#7C8697' }}>
            Richieste
          </div>
          <NavLink to="/richieste-ordini" className={({ isActive }) => isActive ? 'active' : ''} style={{ justifyContent: 'space-between' }}>
            <span>Ordini</span>
            {notificheOrdini > 0 && (
              <span style={{ background: 'var(--orange)', color: '#fff', borderRadius: 999, fontSize: 11, fontWeight: 700, padding: '1px 7px' }}>
                {notificheOrdini}
              </span>
            )}
          </NavLink>
          <NavLink to="/richieste-scarico" className={({ isActive }) => isActive ? 'active' : ''} style={{ justifyContent: 'space-between' }}>
            <span>Scarico</span>
            {notificheScarico > 0 && (
              <span style={{ background: 'var(--orange)', color: '#fff', borderRadius: 999, fontSize: 11, fontWeight: 700, padding: '1px 7px' }}>
                {notificheScarico}
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
        <div style={{ display: sezione === 'richieste-ordini' ? 'block' : 'none' }}><RichiesteOrdini /></div>
        <div style={{ display: sezione === 'richieste-scarico' ? 'block' : 'none' }}><RichiesteScarico /></div>
      </main>
    </div>
  )
}
