import type { UpdateChannel } from '@sand/host-updates/contract'
import { replaceFile } from '../../fs/replace'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

interface LaterEntry {
  build: string
  until: number
}

interface Saved {
  channel: UpdateChannel
  later?: LaterEntry
}

export interface UpdateStore {
  channel(): UpdateChannel
  setChannel(channel: UpdateChannel): Promise<void>
  hidden(buildId: string): boolean
  hide(buildId: string): Promise<void>
}

const day = 24 * 60 * 60 * 1000

export const isChannel = (value: unknown): value is UpdateChannel => value === 'release' || value === 'nightly'

const parseLater = (later: unknown): LaterEntry | undefined => {
  if (!later || typeof later !== 'object') return
  const { build, until } = later as Record<string, unknown>
  if (typeof build !== 'string' || !build || typeof until !== 'number') return
  return { build, until }
}

const parse = (data: unknown): Saved => {
  const saved = data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
  return { channel: isChannel(saved.channel) ? saved.channel : 'release', later: parseLater(saved.later) }
}

const read = (file: string) =>
  Bun.file(file)
    .json()
    .then(parse, () => parse(undefined))

export const loadStore = async (home: string): Promise<UpdateStore> => {
  const file = join(home, 'updates.json')
  const saved = await read(file)
  let saving: Promise<void> = Promise.resolve()
  const write = async () => {
    await mkdir(home, { recursive: true })
    await Bun.write(`${file}.tmp`, `${JSON.stringify(saved, null, 2)}\n`)
    await replaceFile(`${file}.tmp`, file)
  }
  const save = () => {
    saving = saving.catch(() => {}).then(write)
    return saving
  }
  return {
    channel: () => saved.channel,
    setChannel(channel) {
      saved.channel = channel
      return save()
    },
    hidden: buildId => !!saved.later && saved.later.build === buildId && saved.later.until > Date.now(),
    hide(buildId) {
      saved.later = { build: buildId, until: Date.now() + day }
      return save()
    },
  }
}
