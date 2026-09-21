import { useState } from 'react'
import { Link } from 'react-router'
import { safeStorage } from '../lib/safe-storage'

const COOKIE_CONSENT_KEY = 'cm_cookie_consent'

export const CookieBanner = () => {
  const [visible, setVisible] = useState(() => {
    return !safeStorage.getItem(COOKIE_CONSENT_KEY)
  })

  const responder = (tipo: 'accepted' | 'essential') => {
    safeStorage.setItem(COOKIE_CONSENT_KEY, tipo)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <aside
      role="region"
      aria-label="Aviso de cookies y privacidad"
      style={{ boxShadow: 'var(--shadow-24)' }}
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-4xl rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-card)] p-4 sm:p-5 text-[var(--text-body)] animate-modal-dialog"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1 text-xs leading-relaxed text-[var(--text-muted)] max-w-2xl">
          <p className="font-semibold text-[var(--text-body)] flex items-center gap-2">
            <svg className="size-4 text-[var(--color-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Uso de Cookies y Almacenamiento Local</span>
          </p>
          <p>
            Coordinadora utiliza cookies y almacenamiento local estrictamente necesarios para la sesión corporativa y el diagnóstico técnico. Puedes consultar nuestra{' '}
            <Link to="/privacidad" className="font-semibold text-[var(--color-primary)] underline hover:text-[var(--color-primary-hover)]">
              Política de Privacidad
            </Link>.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => responder('essential')}
            className="cursor-pointer rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3.5 py-2 text-xs font-semibold text-[var(--text-body)] transition hover:bg-[var(--border-default)]"
          >
            Solo esenciales
          </button>
          <button
            type="button"
            onClick={() => responder('accepted')}
            className="cursor-pointer rounded-[var(--radius-pill)] bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[var(--color-primary-hover)]"
          >
            Aceptar todas
          </button>
        </div>
      </div>
    </aside>
  )
}
