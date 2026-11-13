export type LogEnvironment = 'prod' | 'test'

export type LogSeverity = 'error' | 'warn' | 'info' | 'debug'

export type ServerLogMessageType =
  | 'authenticated'
  | 'log'
  | 'error'
  | 'info'
  | 'gcloud-login-url'
  | 'gcloud-login-done'

export interface WorkloadInfo {
  readonly cluster: string
  readonly location: string
  readonly project?: string
  readonly namespace: string
  readonly name: string
}

export interface LogStreamMessage {
  readonly id: string
  readonly timestamp: number
  readonly type: ServerLogMessageType
  readonly text?: string
  readonly pod?: string
  readonly url?: string
  readonly ok?: boolean
}

export interface ProcessedLogLine {
  readonly id: string
  readonly pod: string
  readonly text: string
  readonly severity: LogSeverity
  readonly time: string
  readonly fullTime?: string
}
