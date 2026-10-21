import { request, type } from '@sand/host-hub/contract'
import { service } from 'drydock'
import { z } from 'zod'
import type { ChunkedFile } from './chunks'

export type { ChunkedFile }

export interface Transfers {
  reserve(): Promise<string>
  offer(file: string): ChunkedFile
  received(transfer: string, chunks: number, size: number): Promise<string | undefined>
  release(transfer: string): Promise<void>
}

export const transfers = service<Transfers>('transfers')

const chunked = z.object({ transfer: z.string(), size: z.number().int().nonnegative(), chunks: z.number().int().nonnegative() })

export const transfersPull = request('transfers.pull', { input: chunked.extend({ from: z.string().optional() }), output: type<void>() })
export const transfersStatus = request('transfers.status', { input: z.object({ transfer: z.string() }), output: type<number>() })
