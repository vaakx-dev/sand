import { request, type } from '@sand/host-hub/contract'
import { lazy } from '@sand/util'
import { service } from 'drydock'
import { z } from 'zod'
import type { ChunkedFile, PcFetch } from './chunks'

export * from './client'

export { TRANSFER_LIFETIME_MS } from './chunks'

export type { ChunkedFile, PcFetch }

export interface Transfers {
  reserve(): Promise<string>
  offer(file: string): ChunkedFile
  received(transfer: string, chunks: number, size: number): Promise<string | undefined>
  release(transfer: string): Promise<void>
  copy(input: CopyInput): Promise<Copied>
}

export const transfers = service<Transfers>('transfers')

const chunked = lazy(() => z.object({ transfer: z.string(), size: z.number().int().nonnegative(), chunks: z.number().int().nonnegative() }))

export const transfersPull = request('transfers.pull', { input: () => chunked().extend({ from: z.string().optional() }), output: type<void>() })
export const transfersStatus = request('transfers.status', { input: () => z.object({ transfer: z.string() }), output: type<number>() })

const offered = lazy(() => chunked().extend({ folder: z.boolean() }))

export type OfferedPath = z.infer<ReturnType<typeof offered>>

const offerInput = lazy(() => z.object({ path: z.string(), files: z.array(z.string()).optional() }))

export type OfferInput = z.infer<ReturnType<typeof offerInput>>

const saveInput = lazy(() => offered().extend({ from: z.string().optional(), path: z.string() }))

export type SaveInput = z.infer<ReturnType<typeof saveInput>>

const copyInput = lazy(() =>
  z.object({
    from: z.string().min(1),
    to: z.string().min(1),
    fromPc: z.string().min(1).optional(),
    toPc: z.string().min(1).optional(),
    files: z.array(z.string()).optional(),
  }),
)

export type CopyInput = z.infer<ReturnType<typeof copyInput>>

export interface Copied {
  folder: boolean
  size: number
  to: string
  pc?: string
}

export const transfersOffer = request('transfers.offer', { input: offerInput, output: type<OfferedPath>(), callers: 'pc' })
export const transfersSave = request('transfers.save', { input: saveInput, output: type<void>(), callers: 'pc' })
export const transfersCopy = request('transfers.copy', { input: copyInput, output: type<Copied>(), callers: 'any' })
