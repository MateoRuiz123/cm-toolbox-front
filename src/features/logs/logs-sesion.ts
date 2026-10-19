import type { LogEnvironment } from './api/logs-types'

const CLAVE = 'logs_seleccion'

export interface LogsSesion {
  readonly env: LogEnvironment
  readonly namespace: string
  readonly workload: string
}

/** Lee entorno, namespace y carga elegidos en esta pestaña. */
export const leerLogsSesion = (): LogsSesion | null => {
  try {
    const raw = sessionStorage.getItem(CLAVE)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<LogsSesion>
    if (parsed.env !== 'prod' && parsed.env !== 'test') return null
    return {
      env: parsed.env,
      namespace: typeof parsed.namespace === 'string' ? parsed.namespace : '',
      workload: typeof parsed.workload === 'string' ? parsed.workload : '',
    }
  } catch {
    return null
  }
}

/** Guarda la selección del formulario. No reanuda el streaming. */
export const guardarLogsSesion = (sesion: LogsSesion | null): void => {
  try {
    if (!sesion) {
      sessionStorage.removeItem(CLAVE)
      return
    }
    sessionStorage.setItem(CLAVE, JSON.stringify(sesion))
  } catch {
    // La pestaña puede bloquear el almacenamiento.
  }
}

/** Identificador que usa el formulario para una carga de trabajo. */
export const idWorkload = (cluster: string, namespace: string, name: string) =>
  `${cluster}|${namespace}|${name}`
