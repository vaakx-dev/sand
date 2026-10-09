import { replaceFile } from '@sand/host'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

interface LaterEntry {
  build: string
  until: number
}

export interface LaterStore {
  hidden(buildId: string): boolean
  set(buildId: string): Promise<void>
}

const day = 24 * 60 * 60 * 1000

const parse = (data: unknown): LaterEntry | undefined => {
  if (!data || typeof data !== 'object') return
  const later = (data as { later?: unknown }).later
  if (!later || typeof later !== 'object') return
  const { build, until } = later as Record<string, unknown>
  if (typeof build !== 'string' || !build || typeof until !== 'number') return
  return { build, until }
}

const read = (file: string) =>
  Bun.file(file)
    .json()
    .then(parse, () => undefined)

export const loadLater = async (home: string): Promise<LaterStore> => {
  const file = join(home, 'updates.json')
  let entry = await read(file)
  let saving: Promise<void> = Promise.resolve()
  const save = async () => {
    await mkdir(home, { recursive: true })
    await Bun.write(`${file}.tmp`, `${JSON.stringify({ later: entry }, null, 2)}\n`)
    await replaceFile(`${file}.tmp`, file)
  }
  return {
    hidden: buildId => !!entry && entry.build === buildId && entry.until > Date.now(),
    set(buildId) {
      entry = { build: buildId, until: Date.now() + day }
      saving = saving.catch(() => {}).then(save)
      return saving
    },
  }
}
