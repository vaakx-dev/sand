import type { UpdateChannel } from '@sand/protocol'
import { serial } from '../../async/serial'
import { replaceFile } from '../../fs/replace'
import { isRecord } from '../../json/record'
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

export const isChannel = (value: unknown): value is UpdateChannel => value === 'release' || value === 'nightly' || value === 'dev'

const parseLater = (later: unknown): LaterEntry | undefined => {
  if (!isRecord(later)) return
  const { build, until } = later
  if (typeof build !== 'string' || !build || typeof until !== 'number') return
  return { build, until }
}

const parse = (data: unknown): Saved => {
  const saved = isRecord(data) ? data : {}
  return { channel: isChannel(saved.channel) ? saved.channel : 'release', later: parseLater(saved.later) }
}

const read = (file: string) =>
  Bun.file(file)
    .json()
    .then(parse, () => parse(undefined))

export const loadStore = async (home: string): Promise<UpdateStore> => {
  const file = join(home, 'updates.json')
  const saved = await read(file)
  const queue = serial()
  const write = async () => {
    await mkdir(home, { recursive: true })
    await Bun.write(`${file}.tmp`, `${JSON.stringify(saved, null, 2)}\n`)
    await replaceFile(`${file}.tmp`, file)
  }
  const save = () => queue(write)
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
