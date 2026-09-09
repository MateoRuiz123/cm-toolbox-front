import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  errorMessage: string | null
}

/**
 * Atrapa excepciones no controladas en el árbol de componentes
 * para evitar que la aplicación quede en pantalla blanca.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = {
    hasError: false,
    errorMessage: null,
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const message =
      error instanceof Error ? error.message : 'Error inesperado de renderizado.'
    return { hasError: true, errorMessage: message }
  }

  override componentDidCatch(error: unknown, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary capturó una excepción en UI:', error, errorInfo)
  }

  private readonly handleReset = (): void => {
    this.setState({ hasError: false, errorMessage: null })
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <section
          role="alert"
          className="surface mx-auto my-12 max-w-xl rounded-3xl border border-red-500/30 p-6 text-center sm:p-8"
        >
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-red-500/10 text-[var(--bloqueada)]">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-[var(--text)]">
            Algo no salió como se esperaba
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Ocurrió un error al procesar la vista. Esto puede deberse a un formato
            de datos inusual o un fallo temporal.
          </p>
          {this.state.errorMessage && (
            <p className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--bg)] p-3 font-mono text-xs text-[var(--muted)]">
              {this.state.errorMessage}
            </p>
          )}
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={this.handleReset}
              className="cursor-pointer rounded-full bg-[var(--accent)] px-5 py-2 text-xs font-semibold text-[var(--accent-fg)] hover:brightness-105 active:scale-95"
            >
              Intentar de nuevo
            </button>
            <button
              type="button"
              onClick={() => globalThis.location.reload()}
              className="cursor-pointer rounded-full border border-[var(--line)] bg-[var(--surface)] px-5 py-2 text-xs font-semibold text-[var(--text)] hover:bg-[var(--bg)] active:scale-95"
            >
              Recargar página
            </button>
          </div>
        </section>
      )
    }

    return this.props.children
  }
}
