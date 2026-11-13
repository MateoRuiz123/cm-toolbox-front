import type { LogEnvironment } from './api/logs-types'

const CLAVE = 'logs_seleccion'
const CLAVE_FAVORITOS = 'logs_favoritos'
const CLAVE_RECIENTES = 'logs_recientes'
const MAX_RECIENTES = 5

export interface LogsSesion {
  readonly env: LogEnvironment
  readonly namespace: string
  readonly workload: string
}

export interface LogsAccesoRapido {
  readonly env: LogEnvironment
  readonly namespace: string
  readonly workload: string
  readonly cluster: string
  readonly namespaceName: string
  readonly workloadName: string
}

export interface LogsAccesoAgrupado {
  readonly workloadName: string
  readonly prod?: LogsAccesoRapido
  readonly test?: LogsAccesoRapido
}

const leerListaLocal = (clave: string): LogsAccesoRapido[] => {
  try {
    const raw = localStorage.getItem(clave)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is LogsAccesoRapido =>
        typeof item === 'object' &&
        item !== null &&
        (item.env === 'prod' || item.env === 'test') &&
        typeof item.namespace === 'string' &&
        typeof item.workload === 'string' &&
        typeof item.cluster === 'string' &&
        typeof item.namespaceName === 'string' &&
        typeof item.workloadName === 'string',
    )
  } catch {
    return []
  }
}

const guardarListaLocal = (
  clave: string,
  items: readonly LogsAccesoRapido[],
): void => {
  try {
    localStorage.setItem(clave, JSON.stringify(items))
  } catch {
    // La pestaña puede bloquear el almacenamiento.
  }
}

const clavePorUsuario = (base: string, email?: string): string => {
  const normalized = email?.trim().toLowerCase()
  return normalized ? `${base}:${normalized}` : base
}

/** Lee los accesos favoritos guardados en localStorage. */
export const leerLogsFavoritos = (email?: string): LogsAccesoRapido[] =>
  leerListaLocal(clavePorUsuario(CLAVE_FAVORITOS, email))

/** Indica si una carga de trabajo está marcada como favorita en el ambiente dado. */
export const esLogFavorito = (
  favoritos: readonly LogsAccesoRapido[],
  env: LogEnvironment,
  workload: string,
): boolean =>
  favoritos.some((item) => item.env === env && item.workload === workload)

/** Agrega o quita una carga de trabajo de favoritos y devuelve la lista actualizada. */
export const alternarLogFavorito = (
  item: LogsAccesoRapido,
  email?: string,
): LogsAccesoRapido[] => {
  const clave = clavePorUsuario(CLAVE_FAVORITOS, email)
  const actuales = leerListaLocal(clave)
  const existe = esLogFavorito(actuales, item.env, item.workload)
  const siguientes = existe
    ? actuales.filter(
        (fav) => !(fav.env === item.env && fav.workload === item.workload),
      )
    : [item, ...actuales]
  guardarListaLocal(clave, siguientes)
  return siguientes
}

/** Lee los últimos accesos recientes guardados en localStorage. */
export const leerLogsRecientes = (email?: string): LogsAccesoRapido[] =>
  leerListaLocal(clavePorUsuario(CLAVE_RECIENTES, email))

/** Agrupa accesos por nombre de carga de trabajo para evitar duplicados entre ambientes. */
export const agruparAccesosPorWorkload = (
  items: readonly LogsAccesoRapido[],
): LogsAccesoAgrupado[] => {
  const grupos = new Map<string, { prod?: LogsAccesoRapido; test?: LogsAccesoRapido }>()
  for (const item of items) {
    const actual = grupos.get(item.workloadName) ?? {}
    if (item.env === 'prod' && !actual.prod) {
      actual.prod = item
    } else if (item.env === 'test' && !actual.test) {
      actual.test = item
    }
    grupos.set(item.workloadName, actual)
  }
  return Array.from(grupos.entries()).map(([workloadName, envs]) => ({
    workloadName,
    ...envs,
  }))
}

/** Registra una carga de trabajo como reciente (máximo 5 cargas de trabajo únicas). */
export const registrarLogReciente = (
  item: LogsAccesoRapido,
  email?: string,
): LogsAccesoRapido[] => {
  const clave = clavePorUsuario(CLAVE_RECIENTES, email)
  const actuales = leerListaLocal(clave)
  const sinDuplicado = actuales.filter(
    (rec) => !(rec.env === item.env && rec.workloadName === item.workloadName),
  )
  const combinados = [item, ...sinDuplicado]
  const nombresPermitidos = new Set<string>()
  const siguientes = combinados.filter((rec) => {
    if (nombresPermitidos.has(rec.workloadName)) return true
    if (nombresPermitidos.size >= MAX_RECIENTES) return false
    nombresPermitidos.add(rec.workloadName)
    return true
  })
  guardarListaLocal(clave, siguientes)
  return siguientes
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
