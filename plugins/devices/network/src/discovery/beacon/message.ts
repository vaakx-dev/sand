import { lazy } from '@sand/util'
import { z } from 'zod'

const tag = 'sand-beacon'
const maxBytes = 512

export interface BeaconMessage {
  id: string
  port?: number
  ask: boolean
}

const beaconSchema = lazy(() =>
  z.object({
    tag: z.literal(tag),
    id: z.string().min(1).max(64),
    ask: z.unknown().transform(ask => ask === true),
    port: z.number().int().min(1).max(65_535).optional().catch(undefined),
  }),
)

export const encodeBeacon = (message: BeaconMessage) => JSON.stringify({ tag, ...message })

export const decodeBeacon = (raw: Buffer): BeaconMessage | undefined => {
  if (raw.byteLength > maxBytes) return undefined
  let value: unknown
  try {
    value = JSON.parse(raw.toString('utf8'))
  } catch {
    return undefined
  }
  const beacon = beaconSchema().safeParse(value).data
  return beacon && { id: beacon.id, ask: beacon.ask, ...(beacon.port === undefined ? {} : { port: beacon.port }) }
}
