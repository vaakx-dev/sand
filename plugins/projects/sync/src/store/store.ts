import { mkdir, readdir, rename } from 'node:fs/promises'
import { join } from 'node:path'
import { createSink } from '../io/sink'
import { decode, encode, hashOf, largeBlob, type Encoded } from './encoding'
import { readPack, writePack, type PackedObject, type PackWriter } from './pack'

interface Location extends PackedObject {
  pack: string
}

const missing = (id: string) => new Error(`A file is missing from the sync store (${id.slice(0, 12)})`)

const damaged = () => new Error('A file in the sync store was damaged. Send the project again.')

const sliceOf = ({ pack, offset, length }: Location) => Bun.file(pack).slice(offset, offset + length)

const remember = (found: Map<string, Location>, pack: string, objects: PackedObject[]) => {
  for (const object of objects) if (!found.has(object.id)) found.set(object.id, { ...object, pack })
}

const loadPacks = async (packs: string) => {
  const found = new Map<string, Location>()
  const names = (await readdir(packs).catch(() => [])).filter(name => name.endsWith('.pack'))
  const indexes = await Promise.all(names.map(name => readPack(join(packs, name)).catch(() => undefined)))
  names.forEach((name, index) => remember(found, join(packs, name), indexes[index]?.objects ?? []))
  return found
}

export const createStore = (dir: string) => {
  const packs = join(dir, 'packs')
  const pending = new Map<string, Encoded>()
  let listing: Promise<Map<string, Location>> | undefined

  const objects = () => (listing ??= loadPacks(packs))

  const locate = async (id: string) => {
    const found = (await objects()).get(id)
    if (!found) throw missing(id)
    return found
  }

  const has = async (id: string) => pending.has(id) || (await objects()).has(id)

  const largePacked = async (id: string) => {
    if (pending.has(id)) return undefined
    const found = await locate(id)
    return found.length > largeBlob ? found : undefined
  }

  const stored = async (id: string): Promise<Encoded> => {
    const waiting = pending.get(id)
    if (waiting) return waiting
    const found = await locate(id)
    return { bytes: await sliceOf(found).bytes(), compressed: found.compressed }
  }

  const read = async (id: string) => {
    const bytes = decode(await stored(id))
    if (hashOf(bytes) !== id) throw damaged()
    return bytes
  }

  const newPack = async () => {
    await mkdir(packs, { recursive: true })
    return join(packs, `${Bun.randomUUIDv7()}.pack`)
  }

  const addPack = async (fill: (writer: PackWriter) => Promise<void>, head?: string) => {
    const pack = await newPack()
    remember(await objects(), pack, (await writePack(pack, fill, head)).objects)
    return pack
  }

  return {
    has,
    read,
    addPack,

    async put(bytes: Uint8Array) {
      const id = hashOf(bytes)
      if (!(await has(id))) pending.set(id, await encode(bytes))
      return id
    },

    async copyInto(writer: PackWriter, id: string) {
      const large = await largePacked(id)
      if (large) return writer.stream(id, sliceOf(large).stream(), large.compressed)
      await writer.add(id, await stored(id))
    },

    async writeTo(id: string, target: string) {
      const large = await largePacked(id)
      if (!large || large.compressed) return void (await Bun.write(target, await read(id)))
      const sink = await createSink(target)
      await sink.copy(sliceOf(large).stream())
      await sink.end()
    },

    async adopt(file: string, received: PackedObject[]) {
      const pack = await newPack()
      await rename(file, pack).catch(() => Bun.write(pack, Bun.file(file)))
      remember(await objects(), pack, received)
    },

    async flush() {
      const batch = [...pending]
      if (batch.length === 0) return
      await addPack(async writer => {
        for (const [id, encoded] of batch) await writer.add(id, encoded)
      })
      for (const [id] of batch) pending.delete(id)
    },
  }
}

export type Store = ReturnType<typeof createStore>
