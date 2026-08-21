import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import Giacenze from '../pages/Giacenze'
import Movimenti from '../pages/Movimenti'
import Articoli from '../pages/Articoli'
import Dipendenti from '../pages/Dipendenti'

const SEZIONI_VALIDE = ['giacenze', 'movimenti', 'articoli', 'dipendenti']

export default function Layout() {
  const { session, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const sezioneCorrente = location.pathname.replace(/^\//, '') || 'giacenze'
  const sezione = SEZIONI_VALIDE.includes(sezioneCorrente) ? sezioneCorrente : 'giacenze'

  // Se l'indirizzo non corrisponde a nessuna sezione nota (es. "/" o un
  // link non valido), riporta a Giacenze senza smontare le pagine già aperte.
  useEffect(() => {
    if (!SEZIONI_VALIDE.includes(sezioneCorrente)) {
      navigate('/giacenze', { replace: true })
    }
  }, [sezioneCorrente, navigate])

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
        </nav>
        <div className="sidebar-footer">
          <div style={{ marginBottom: 8, color: '#9CA9B8', fontSize: 12 }} className="mono">
            {session?.user?.email}
          </div>
          <button onClick={signOut}>Esci</button>
        </div>
      </aside>
      <main className="main">
        {/* Le 4 pagine restano sempre montate: passando da una all'altra
            si nasconde/mostra con CSS, senza perdere ciò che stavi scrivendo. */}
        <div style={{ display: sezione === 'giacenze' ? 'block' : 'none' }}><Giacenze /></div>
        <div style={{ display: sezione === 'movimenti' ? 'block' : 'none' }}><Movimenti /></div>
        <div style={{ display: sezione === 'articoli' ? 'block' : 'none' }}><Articoli /></div>
        <div style={{ display: sezione === 'dipendenti' ? 'block' : 'none' }}><Dipendenti /></div>
      </main>
    </div>
  )
}
