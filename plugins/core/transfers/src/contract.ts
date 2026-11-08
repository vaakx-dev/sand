import { request, type } from '@sand/host-hub/contract'
import { service } from 'drydock'
import { z } from 'zod'
import type { ChunkedFile } from './chunks'

export * from './client'

export type { ChunkedFile }

export interface Transfers {
  reserve(): Promise<string>
  offer(file: string): ChunkedFile
  received(transfer: string, chunks: number, size: number): Promise<string | undefined>
  release(transfer: string): Promise<void>
  offerPath(input: OfferInput): Promise<OfferedPath>
  savePath(input: SaveInput): Promise<void>
}

export const transfers = service<Transfers>('transfers')

const chunked = z.object({ transfer: z.string(), size: z.number().int().nonnegative(), chunks: z.number().int().nonnegative() })

export const transfersPull = request('transfers.pull', { input: chunked.extend({ from: z.string().optional() }), output: type<void>() })
export const transfersStatus = request('transfers.status', { input: z.object({ transfer: z.string() }), output: type<number>() })

const offered = chunked.extend({ folder: z.boolean() })

export type OfferedPath = z.infer<typeof offered>

const offerInput = z.object({ path: z.string(), files: z.array(z.string()).optional() })

export type OfferInput = z.infer<typeof offerInput>

const saveInput = offered.extend({ from: z.string().optional(), path: z.string() })

export type SaveInput = z.infer<typeof saveInput>

export const transfersOffer = request('transfers.offer', { input: offerInput, output: type<OfferedPath>(), callers: 'pc' })
export const transfersSave = request('transfers.save', { input: saveInput, output: type<void>(), callers: 'pc' })
