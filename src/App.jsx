import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Giacenze from './pages/Giacenze'
import Movimenti from './pages/Movimenti'
import Articoli from './pages/Articoli'
import Dipendenti from './pages/Dipendenti'

function PrivateArea() {
  const { session } = useAuth()

  if (session === undefined) {
    return <div style={{ padding: 40, color: '#55606B' }}>Caricamento…</div>
  }
  if (session === null) {
    return <Login />
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/giacenze" replace />} />
        <Route path="/giacenze" element={<Giacenze />} />
        <Route path="/movimenti" element={<Movimenti />} />
        <Route path="/articoli" element={<Articoli />} />
        <Route path="/dipendenti" element={<Dipendenti />} />
        <Route path="*" element={<Navigate to="/giacenze" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <PrivateArea />
      </AuthProvider>
    </HashRouter>
  )
}
