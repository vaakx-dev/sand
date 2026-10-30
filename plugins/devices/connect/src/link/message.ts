import type { ServerMessage } from '@sand/host-hub/contract'
import { isRecord } from '@sand/util'

const parsed = (raw: string): unknown => {
  try {
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

export const parseServerMessage = (raw: string): ServerMessage | undefined => {
  const value = parsed(raw)
  if (!isRecord(value)) return undefined
  if (value.type === 'event' && typeof value.name === 'string') return { type: 'event', name: value.name, payload: value.payload }
  if (value.type !== 'result' || typeof value.id !== 'number') return undefined
  return typeof value.error === 'string'
    ? { type: 'result', id: value.id, error: value.error }
    : { type: 'result', id: value.id, result: value.result }
}
