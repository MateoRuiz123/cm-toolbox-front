import { describe, expect, it } from 'vitest'
import {
  appendBoundedLog,
  MAX_LOG_LINES,
} from '../../../src/features/logs/logs-buffer'
import type { LogStreamMessage } from '../../../src/features/logs/api/logs-types'

const message = (id: string, text: string): LogStreamMessage => ({
  id,
  timestamp: 1,
  type: 'log',
  text,
})

describe('appendBoundedLog', () => {
  it('conserva solamente las líneas más recientes', () => {
    const previous = Array.from({ length: MAX_LOG_LINES }, (_, index) =>
      message(`old-${index}`, `old-${index}`),
    )

    const result = appendBoundedLog(previous, message('new', 'new-line'))

    expect(result).toHaveLength(MAX_LOG_LINES)
    expect(result[0].id).toBe('old-1')
    expect(result.at(-1)?.id).toBe('new')
  })

  it('recorta un único mensaje multilínea sobredimensionado', () => {
    const lines = Array.from(
      { length: MAX_LOG_LINES + 2 },
      (_, index) => `line-${index}`,
    )

    const result = appendBoundedLog([], message('large', lines.join('\n')))

    expect(result).toHaveLength(1)
    expect(result[0].text?.split('\n')).toHaveLength(MAX_LOG_LINES)
    expect(result[0].text).not.toContain('line-0\n')
  })
})
