import { HashRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'

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
      <Route path="/*" element={<Layout />} />
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
