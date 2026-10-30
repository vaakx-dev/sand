import type { Peers } from '@sand/devices-contract'
import { mkdir } from 'node:fs/promises'
import { isAbsolute } from 'node:path'
import type { OfferedPath } from '../contract'
import { pullFrom } from '../pull'
import type { TransferStore } from '../transfers'

export const saveFrom = (transfers: TransferStore, peers: () => Peers | undefined) => {
  const pull = pullFrom(transfers, peers)
  return async ({ path, folder, ...file }: OfferedPath & { from?: string; path: string }) => {
    if (!isAbsolute(path)) throw new Error(`${path} is not an absolute path`)
    await pull(file)
    try {
      const received = await transfers.received(file.transfer, file.chunks, file.size)
      if (folder && received) {
        await mkdir(path, { recursive: true })
        await new Bun.Archive(await Bun.file(received).bytes()).extract(path)
      } else {
        await Bun.write(path, received ? Bun.file(received) : '')
      }
    } finally {
      await transfers.release(file.transfer)
    }
  }
}
