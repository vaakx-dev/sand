import { isRecord } from '@sand/util'

const tag = 'sand-beacon'
const maxBytes = 512

export interface BeaconMessage {
  id: string
  port?: number
  ask: boolean
}

const isPort = (value: unknown): value is number => Number.isInteger(value) && (value as number) > 0 && (value as number) < 65_536

export const encodeBeacon = (message: BeaconMessage) => JSON.stringify({ tag, ...message })

export const decodeBeacon = (raw: Buffer): BeaconMessage | undefined => {
  if (raw.byteLength > maxBytes) return undefined
  let value: unknown
  try {
    value = JSON.parse(raw.toString('utf8'))
  } catch {
    return undefined
  }
  if (!isRecord(value) || value.tag !== tag || typeof value.id !== 'string' || !value.id || value.id.length > 64) return undefined
  return { id: value.id, ask: value.ask === true, ...(isPort(value.port) ? { port: value.port } : {}) }
}
