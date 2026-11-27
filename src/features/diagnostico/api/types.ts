export type Veredicto = 'OK' | 'PARCIAL' | 'NO_MIGRADA' | 'BLOQUEADA' | 'NO_ENCONTRADA'
export type ResultadoCheck = 'cumple' | 'no_cumple'
export type TipoCuenta = string

export interface CheckResultado {
  id: string
  nombre: string
  resultado: ResultadoCheck
  causa?: string
  consecuencia?: string
  que_paso?: string | string[]
  solucion?: string[]
}

export interface GuiaDiagnostico {
  codigo_remision: string
  veredicto: Veredicto
  resumen: string
  solucion: string[]
  checks: CheckResultado[]
}

export interface ItemDiagnostico {
  origen: 'despacho' | 'remision'
  codigo_despacho?: number
  codigo_remision?: string
  id_cliente?: number
  equipo?: string | null
  recibidor?: number | null
  movil?: string | null
  enviado?: boolean
  estado?: number
  entra_polling?: boolean
  cuenta: TipoCuenta
  veredicto: Veredicto
  resumen?: string
  solucion?: string[]
  guias: GuiaDiagnostico[]
}

export interface DiagnosticoOutput {
  veredicto: Veredicto
  es_testing?: boolean
  items: ItemDiagnostico[]
}

export interface AsignarEquipoDespachoInput {
  id_cliente: number
  codigo_despacho: number
  equipo: string
  recibidor: number
  movil?: string | null
}

export interface AsignarEquipoDespachoOutput {
  id_cliente: number
  codigo_despacho: number
  equipo: string
  recibidor: number
  movil: string | null
}

export interface DiagnosticoInput {
  codigos_remision: string[]
  codigos_despacho: number[]
}

export type ReintentoStatus = 'idle' | 'loading' | 'success' | 'error'

export interface ReintentoItemState {
  status: ReintentoStatus
  error?: string
}

export interface ReintentoResultado {
  codigo_remision: string
  success: boolean
  message?: string
}
