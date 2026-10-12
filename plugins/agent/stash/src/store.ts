import type { Stashed } from './contract'
import { isRecord } from '@sand/kit'
import { writePrivateJson } from '@sand/kit/fs'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

export const safeId = /^[\w-]{1,64}$/

const isStashed = (value: unknown): value is Stashed =>
  isRecord(value) && typeof value.id === 'string' && safeId.test(value.id) && typeof value.text === 'string' && Array.isArray(value.content) && typeof value.at === 'number'

const readAll = async (folder: string) => {
  const names = await Array.fromAsync(new Bun.Glob('*.json').scan({ cwd: folder, onlyFiles: true }))
  const read = await Promise.all(names.map(name => Bun.file(join(folder, name)).json().catch(() => undefined)))
  return read.filter(isStashed)
}

export const createStore = async (home: string) => {
  const folder = join(home, 'stash')
  await mkdir(folder, { recursive: true })
  const items = new Map((await readAll(folder)).map(item => [item.id, item]))
  const file = (id: string) => join(folder, `${id}.json`)

  return {
    list: () => [...items.values()].sort((a, b) => b.at - a.at),
    async save(item: Stashed) {
      await writePrivateJson(file(item.id), item)
      items.set(item.id, item)
    },
    async remove(id: string) {
      if (!items.delete(id)) return false
      await Bun.file(file(id)).delete().catch(() => {})
      return true
    },
  }
}

export type Store = Awaited<ReturnType<typeof createStore>>
