import { useEffect, useState } from 'react'

const sistemaPideReducir = () =>
  globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

const preferenciaPideReducir = () =>
  document.documentElement.dataset.movimiento === 'reducido'

/** Combina la preferencia del sistema operativo con el interruptor de Apariencia. */
export const useMovimientoReducido = () => {
  const [reducido, setReducido] = useState(
    () => sistemaPideReducir() || preferenciaPideReducir(),
  )

  useEffect(() => {
    const media = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')
    const actualizar = () => setReducido(sistemaPideReducir() || preferenciaPideReducir())
    media?.addEventListener('change', actualizar)
    const observer = new MutationObserver(actualizar)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-movimiento'],
    })
    return () => {
      media?.removeEventListener('change', actualizar)
      observer.disconnect()
    }
  }, [])

  return reducido
}
