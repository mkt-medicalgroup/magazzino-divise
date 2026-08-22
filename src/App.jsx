import { HashRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import RichiediOrdine from './pages/RichiediOrdine'
import RichiediScarico from './pages/RichiediScarico'

// Area privata: richiede login. Racchiude tutte le sezioni gestionali.
function PrivateArea() {
  const { session } = useAuth()

  if (session === undefined) {
    return <div style={{ padding: 40, color: '#55606B' }}>Caricamento…</div>
  }
  if (session === null) {
    return <Login />
  }
  return <Layout />
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        {/* Modulo pubblico: nessun login richiesto, accessibile solo tramite link diretto */}
        <Route path="/richiedi-ordine" element={<RichiediOrdine />} />
        <Route path="/richiedi-scarico" element={<RichiediScarico />} />

        {/* Tutto il resto dell'app richiede autenticazione */}
        <Route
          path="/*"
          element={
            <AuthProvider>
              <PrivateArea />
            </AuthProvider>
          }
        />
      </Routes>
    </HashRouter>
  )
}
