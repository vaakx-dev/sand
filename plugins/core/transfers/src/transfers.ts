import { freeBytes, isMissing } from '@sand/util/fs'
import { appendFile, mkdir, open, readdir, readFile, rm, stat, type FileHandle } from 'node:fs/promises'
import { join } from 'node:path'
import { chunkBytes, chunkCount, chunkFits, TRANSFER_LIFETIME_MS, type ChunkedFile } from './chunks'

const keepFree = 1024 ** 3

const TRANSFER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Outgoing = { file: string; touched: number }

interface Opened {
  handle: FileHandle
  written: Set<number>
}

type Incoming = Outgoing & { size: number; opened: Promise<Opened> }

type SizedTransfer = Pick<ChunkedFile, 'transfer' | 'size'>

const offsetOf = (index: number) => {
  if (!Number.isSafeInteger(index) || index < 0) throw new Error('That chunk index is not valid')
  return index * chunkBytes
}

const logOf = (part: string) => `${part}.chunks`

const unlessMissing =
  <T>(fallback: T) =>
  (error: unknown) => {
    if (isMissing(error)) return fallback
    throw error
  }

const writtenIn = async (part: string) => {
  const log = await readFile(logOf(part), 'utf8').catch(unlessMissing(''))
  return new Set(log.split('\n').filter(Boolean).map(Number))
}

const removePart = async (part: string) => {
  await rm(part, { force: true })
  await rm(logOf(part), { force: true })
}

export const createTransfers = (folder: string) => {
  const outgoing = new Map<string, Outgoing>()
  const incoming = new Map<string, Incoming>()
  const claimed = new Map<string, Incoming>()

  const partOf = ({ transfer, size }: SizedTransfer) => {
    if (!TRANSFER_ID.test(transfer)) throw new Error('That transfer id is not valid')
    return join(folder, `${transfer}.${size}`)
  }

  const promised = () => [...incoming.values()].reduce((total, entry) => total + entry.size, 0)

  const openWithRoom = async (part: string): Promise<Opened> => {
    await mkdir(folder, { recursive: true })
    if (promised() + keepFree > freeBytes(folder)) throw new Error('This PC does not have enough free disk space for that transfer')
    return { handle: await open(part, 'w'), written: new Set() }
  }

  const reopen = async (part: string): Promise<Opened> => {
    const handle = await open(part, 'r+').catch(unlessMissing(undefined))
    return handle ? { handle, written: await writtenIn(part) } : openWithRoom(part)
  }

  const arrive = (file: SizedTransfer) => {
    const part = partOf(file)
    const entry: Incoming = { file: part, size: file.size, touched: Date.now(), opened: reopen(part) }
    incoming.set(file.transfer, entry)
    entry.opened.catch(() => incoming.get(file.transfer) === entry && incoming.delete(file.transfer))
    return entry
  }

  const known = async (file: SizedTransfer) => incoming.get(file.transfer) ?? ((await Bun.file(partOf(file)).exists()) ? arrive(file) : undefined)

  const close = async (entry: Incoming) => (await entry.opened).handle.close()

  const forget = async (held: Map<string, Outgoing | Incoming>, transfer: string) => {
    const entry = held.get(transfer)
    if (!entry) return
    held.delete(transfer)
    if (!('opened' in entry)) return
    await close(entry)
    await removePart(entry.file)
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
      const { handle, written } = await entry.opened
      await handle.write(bytes, 0, bytes.length, index * chunkBytes)
      await appendFile(logOf(entry.file), `${index}\n`)
      written.add(index)
    },

    async received(transfer: string, chunks: number, size: number) {
      if (chunks === 0) return undefined
      const entry = await known({ transfer, size })
      const opened = await entry?.opened
      if (!entry || !opened || entry.size !== size || chunks !== chunkCount(size) || opened.written.size !== chunks)
        throw new Error(`Only ${opened?.written.size ?? 0} of ${chunks} chunks arrived; try again`)
      await opened.handle.close()
      await rm(logOf(entry.file), { force: true })
      incoming.delete(transfer)
      claimed.set(transfer, entry)
      return entry.file
    },

    async release(transfer: string) {
      await forget(incoming, transfer)
      await forget(claimed, transfer)
    },

    async close() {
      await Promise.all([...incoming.values()].map(close))
    },

    async sweep() {
      const cutoff = Date.now() - TRANSFER_LIFETIME_MS
      for (const held of [outgoing, incoming]) for (const [transfer, entry] of held) if (entry.touched < cutoff) await forget(held, transfer)
      const parts = [...incoming.values(), ...claimed.values()].map(entry => entry.file)
      const live = new Set([...[...outgoing.values()].map(entry => entry.file), ...parts, ...parts.map(logOf)])
      for (const name of await readdir(folder).catch((): string[] => [])) {
        const file = join(folder, name)
        const info = await stat(file).catch(() => undefined)
        if (!live.has(file) && info && info.mtimeMs < cutoff) await rm(file, { force: true })
      }
    },
  }
}

export type TransferStore = ReturnType<typeof createTransfers>
