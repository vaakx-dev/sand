import type { UpdateChannel } from '@sand/host-updates/contract'
import { serial } from '@sand/util'
import { readState, writeAtomic } from '@sand/util/fs'
import { join } from 'node:path'
import { z } from 'zod'

export interface UpdateStore {
  channel(): UpdateChannel
  setChannel(channel: UpdateChannel): Promise<void>
  hidden(buildId: string): boolean
  hide(buildId: string): Promise<void>
  dismissed(id: string): boolean
  dismiss(id: string): Promise<void>
}

const day = 24 * 60 * 60 * 1000

const channel = z.enum(['release', 'nightly', 'dev'] satisfies UpdateChannel[])

export const isChannel = (value: unknown): value is UpdateChannel => channel.safeParse(value).success

const stored = z
  .object({
    channel: channel.catch('release'),
    later: z.object({ build: z.string().min(1), until: z.number() }).optional().catch(undefined),
    dismissed: z
      .array(z.unknown())
      .catch([])
      .transform(ids => ids.filter(id => typeof id === 'string')),
  })
  .catch({ channel: 'release', later: undefined, dismissed: [] })

type Saved = z.infer<typeof stored>

const read = async (file: string): Promise<Saved> => (await readState(file, data => stored.parse(data))) ?? stored.parse(undefined)

export const loadUpdateStore = async (home: string): Promise<UpdateStore> => {
  const file = join(home, 'updates.json')
  const saved = await read(file)
  const queue = serial()
  const save = () => queue(() => writeAtomic(file, `${JSON.stringify(saved, null, 2)}\n`))
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
    dismissed: id => saved.dismissed.includes(id),
    dismiss(id) {
      if (saved.dismissed.includes(id)) return Promise.resolve()
      saved.dismissed = [...saved.dismissed, id]
      return save()
    },
  }
}
