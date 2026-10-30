import { request, type, wireEvent } from '@sand/host-hub/contract'
import { z } from 'zod'

export type ViaEncoding = 'utf8' | 'base64'

export interface ViaReply {
  status: number
  headers: Record<string, string>
  body: string
  encoding: ViaEncoding
}

export interface ViaBody {
  data: string
  encoding: ViaEncoding
}

export type ViaFrame = { stream: string; data: string } | { stream: string; closed: string }

export const viaMethods = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] as const

const pc = z.string().min(1)
const stream = z.string().min(1)

export const viaFetch = request('via.fetch', {
  input: z.object({
    pc,
    path: z.string().startsWith('/'),
    method: z.enum(viaMethods).optional(),
    headers: z.record(z.string(), z.string()).optional(),
    body: z.object({ data: z.string(), encoding: z.enum(['utf8', 'base64']) }).optional(),
  }),
  output: type<ViaReply>(),
  callers: 'any',
})
export const viaOpen = request('via.open', { input: z.object({ pc, ticket: z.string().min(1) }), output: type<{ stream: string }>(), callers: 'any' })
export const viaSend = request('via.send', { input: z.object({ stream, data: z.string() }), output: type<void>(), callers: 'any' })
export const viaClose = request('via.close', { input: z.object({ stream }), output: type<void>(), callers: 'any' })

export const viaFrame = wireEvent<ViaFrame>('via.frame')
