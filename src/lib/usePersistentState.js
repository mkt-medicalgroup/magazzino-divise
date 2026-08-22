import { useState, useEffect } from 'react'

// Si comporta come useState, ma il valore sopravvive quando si cambia
// pagina (e a un refresh), perché viene tenuto nella sessionStorage del
// browser invece che solo nella memoria del componente. Si azzera quando
// si chiude la scheda del browser — è pensato per non perdere un modulo
// a metà o un filtro impostato, non come archivio permanente.
export function usePersistentState(key, initialValue) {
  const fullKey = `magazzino:${key}`

  const [state, setState] = useState(() => {
    try {
      const stored = sessionStorage.getItem(fullKey)
      return stored !== null ? JSON.parse(stored) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    try {
      sessionStorage.setItem(fullKey, JSON.stringify(state))
    } catch {
      // sessionStorage non disponibile (es. modalità privata): nessun problema,
      // l'app funziona comunque, semplicemente non ricorda tra le pagine
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullKey, state])

  return [state, setState]
}
