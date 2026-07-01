import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

export default function Layout() {
  const { session, signOut } = useAuth()

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
        <Outlet />
      </main>
    </div>
  )
}
