import RichiesteOrdini from './RichiesteOrdini'
import RichiesteScarico from './RichiesteScarico'

export default function Richieste() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Richieste</h2>
          <p className="sub">Ordini e restituzioni arrivati dai moduli pubblici, senza bisogno di accesso da parte di chi li compila.</p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: 24, alignItems: 'start' }}>
        <div>
          <RichiesteOrdini />
        </div>
        <div>
          <RichiesteScarico />
        </div>
      </div>
    </div>
  )
}
