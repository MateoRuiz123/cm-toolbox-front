import type { LogStreamMessage } from './api/logs-types'

export const MAX_LOG_LINES = 2_000

const splitLines = (message: LogStreamMessage): string[] =>
  (message.text ?? '').split('\n').filter((line) => line.trim())

const lineCount = (message: LogStreamMessage): number =>
  message.text ? Math.max(1, splitLines(message).length) : 0

/**
 * Agrega un evento conservando como máximo las líneas más recientes.
 * Los mensajes de control sin texto no consumen capacidad.
 */
export const appendBoundedLog = (
  current: readonly LogStreamMessage[],
  incoming: LogStreamMessage,
): LogStreamMessage[] => {
  const incomingLines = splitLines(incoming)
  const normalized =
    incomingLines.length > MAX_LOG_LINES
      ? { ...incoming, text: incomingLines.slice(-MAX_LOG_LINES).join('\n') }
      : incoming

  const next = [...current, normalized]
  let total = next.reduce((sum, message) => sum + lineCount(message), 0)
  let first = 0
  while (total > MAX_LOG_LINES && first < next.length) {
    total -= lineCount(next[first])
    first += 1
  }
  return first > 0 ? next.slice(first) : next
}
