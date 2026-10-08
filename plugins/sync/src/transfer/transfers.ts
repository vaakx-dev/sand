import { appendFile, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export const chunkSize = 1024 * 1024

const lifetime = 15 * 60 * 1000

interface Entry {
  file: string
  timer?: ReturnType<typeof setTimeout>
}

interface Receiving extends Entry {
  received: number
}

const folder = () => join(tmpdir(), 'sand-sync')

const safe = (id: string) => id.replace(/[^\w-]/g, '')

export const createTransfers = () => {
  const outgoing = new Map<string, Entry>()
  const incoming = new Map<string, Receiving>()

  const forget = async (map: Map<string, Entry>, id: string) => {
    const entry = map.get(id)
    if (!entry) return
    clearTimeout(entry.timer)
    map.delete(id)
    await rm(entry.file, { force: true })
  }

  const expire = (map: Map<string, Entry>, id: string, entry: Entry) => {
    clearTimeout(entry.timer)
    entry.timer = setTimeout(() => void forget(map, id), lifetime)
    entry.timer.unref()
    map.set(id, entry)
  }

  return {
    async reserve(name: string) {
      await mkdir(folder(), { recursive: true })
      return join(folder(), `${name}-${Bun.randomUUIDv7()}.bundle`)
    },

    offer(file: string) {
      const transfer = Bun.randomUUIDv7()
      const size = Bun.file(file).size
      expire(outgoing, transfer, { file })
      return { transfer, size, chunks: Math.ceil(size / chunkSize) }
    },

    async chunk(id: string, index: number) {
      const held = outgoing.get(id)
      if (!held) throw new Error('This transfer has expired')
      const bytes = await Bun.file(held.file).slice(index * chunkSize, (index + 1) * chunkSize).bytes()
      return { data: bytes.toBase64() }
    },

    async receive(id: string, index: number, data: string) {
      await mkdir(folder(), { recursive: true })
      const current = incoming.get(id) ?? { file: join(folder(), `in-${safe(id)}.bundle`), received: 0 }
      if (index === 0) {
        await rm(current.file, { force: true })
        current.received = 0
      }
      if (index !== current.received) throw new Error(`Expected chunk ${current.received}, got ${index}`)
      await appendFile(current.file, Uint8Array.fromBase64(data))
      current.received++
      expire(incoming, id, current)
    },

    received(id: string, chunks: number) {
      if (chunks === 0) return undefined
      const current = incoming.get(id)
      if (!current || current.received !== chunks) throw new Error(`Received ${current?.received ?? 0} of ${chunks} chunks`)
      return current.file
    },

    release: (id: string) => forget(incoming, id),

    async dispose() {
      await Promise.all([...outgoing.keys()].map(id => forget(outgoing, id)))
      await Promise.all([...incoming.keys()].map(id => forget(incoming, id)))
    },
  }
}

export type Transfers = ReturnType<typeof createTransfers>
