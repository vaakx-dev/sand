import type { ChunkedFile } from '@sand/kit/transfers'

export type { ChunkedFile }

export interface Transfers {
  reserve(): Promise<string>
  offer(file: string): ChunkedFile
  received(transfer: string, chunks: number, size: number): Promise<string | undefined>
  release(transfer: string): Promise<void>
}

declare module '@sand/protocol/wire' {
  interface WireRequests {
    'transfers.pull': ChunkedFile & { from?: string }
    'transfers.status': { transfer: string }
  }
}

declare module 'drydock' {
  interface Services {
    transfers: Transfers
  }
}
