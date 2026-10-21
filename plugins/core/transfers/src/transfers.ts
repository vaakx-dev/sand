import { mkdir, open, readdir, rm, stat, statfs, type FileHandle } from 'node:fs/promises'
import { join } from 'node:path'
import { chunkBytes, chunkCount, chunkFits, type ChunkedFile } from './chunks'

const lifetime = 15 * 60_000

const keepFree = 1024 ** 3

type Outgoing = { file: string; touched: number }

type Incoming = Outgoing & { size: number; handle: Promise<FileHandle>; written: Set<number> }

type SizedTransfer = Pick<ChunkedFile, 'transfer' | 'size'>

const offsetOf = (index: number) => {
  if (!Number.isSafeInteger(index) || index < 0) throw new Error('That chunk index is not valid')
  return index * chunkBytes
}

export const createTransfers = (folder: string) => {
  const outgoing = new Map<string, Outgoing>()
  const incoming = new Map<string, Incoming>()
  const claimed = new Map<string, Incoming>()

  const promised = () => [...incoming.values()].reduce((total, entry) => total + entry.size, 0)

  const openWithRoom = async (file: string) => {
    await mkdir(folder, { recursive: true })
    const { bavail, bsize } = await statfs(folder)
    if (promised() + keepFree > bavail * bsize) throw new Error('This PC does not have enough free disk space for that transfer')
    return open(file, 'w')
  }

  const arrive = ({ transfer, size }: SizedTransfer) => {
    const file = join(folder, Bun.randomUUIDv7())
    const entry: Incoming = { file, size, touched: Date.now(), handle: openWithRoom(file), written: new Set() }
    incoming.set(transfer, entry)
    entry.handle.catch(() => incoming.get(transfer) === entry && incoming.delete(transfer))
    return entry
  }

  const forget = async (held: Map<string, Outgoing | Incoming>, transfer: string) => {
    const entry = held.get(transfer)
    if (!entry) return
    held.delete(transfer)
    if ('handle' in entry) await entry.handle.then(handle => handle.close()).catch(() => undefined)
    await rm(entry.file, { force: true })
  }

  return {
    async reserve() {
      await mkdir(folder, { recursive: true })
      return join(folder, Bun.randomUUIDv7())
    },

    offer(file: string) {
      const transfer = Bun.randomUUIDv7()
      const size = Bun.file(file).size
      outgoing.set(transfer, { file, touched: Date.now() })
      return { transfer, size, chunks: chunkCount(size) }
    },

    read(transfer: string, index: number) {
      const entry = outgoing.get(transfer)
      if (!entry) throw new Error('This transfer has expired')
      entry.touched = Date.now()
      const offset = offsetOf(index)
      return Bun.file(entry.file).slice(offset, offset + chunkBytes)
    },

    async write(file: SizedTransfer, index: number, bytes: Uint8Array) {
      if (!chunkFits(file.size, index, bytes.length)) throw new Error('That chunk does not fit the transfer')
      const entry = incoming.get(file.transfer) ?? arrive(file)
      if (entry.size !== file.size) throw new Error('That chunk belongs to a transfer of another size')
      entry.touched = Date.now()
      await (await entry.handle).write(bytes, 0, bytes.length, index * chunkBytes)
      entry.written.add(index)
    },

    arrived: (transfer: string) => incoming.get(transfer)?.written.size ?? 0,

    async received(transfer: string, chunks: number, size: number) {
      if (chunks === 0) return undefined
      const entry = incoming.get(transfer)
      if (!entry || entry.size !== size || chunks !== chunkCount(size) || entry.written.size !== chunks)
        throw new Error(`Only ${entry?.written.size ?? 0} of ${chunks} chunks arrived; try again`)
      await (await entry.handle).close()
      incoming.delete(transfer)
      claimed.set(transfer, entry)
      return entry.file
    },

    async release(transfer: string) {
      await forget(incoming, transfer)
      await forget(claimed, transfer)
    },

    async sweep() {
      const cutoff = Date.now() - lifetime
      for (const held of [outgoing, incoming]) for (const [transfer, entry] of held) if (entry.touched < cutoff) await forget(held, transfer)
      const live = new Set([...outgoing.values(), ...incoming.values(), ...claimed.values()].map(entry => entry.file))
      for (const name of await readdir(folder).catch((): string[] => [])) {
        const file = join(folder, name)
        const info = await stat(file).catch(() => undefined)
        if (!live.has(file) && info && info.mtimeMs < cutoff) await rm(file, { force: true })
      }
    },
  }
}

export type TransferStore = ReturnType<typeof createTransfers>
