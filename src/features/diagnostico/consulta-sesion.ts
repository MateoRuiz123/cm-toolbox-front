const CLAVE = 'diagnostico_consulta'

export interface ConsultaSesion {
  readonly remisiones: string
  readonly despachos: string
}

const vacia = (): ConsultaSesion => ({ remisiones: '', despachos: '' })

/** Lee la última consulta de la pestaña. No sobrevive al cerrarla. */
export const leerConsultaSesion = (): ConsultaSesion => {
  try {
    const raw = sessionStorage.getItem(CLAVE)
    if (!raw) return vacia()
    const parsed = JSON.parse(raw) as Partial<ConsultaSesion>
    return {
      remisiones: typeof parsed.remisiones === 'string' ? parsed.remisiones : '',
      despachos: typeof parsed.despachos === 'string' ? parsed.despachos : '',
    }
  } catch {
    return vacia()
  }
}

/** Guarda remisiones y despachos escritos, sin el resultado de la consulta. */
export const guardarConsultaSesion = (consulta: ConsultaSesion): void => {
  try {
    sessionStorage.setItem(CLAVE, JSON.stringify(consulta))
  } catch {
    // La pestaña puede bloquear el almacenamiento.
  }
}
