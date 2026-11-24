import { DEFAULT_UPDATE_CHANNEL, type UpdateChannel } from '@sand/host-updates/contract'
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

const channels = z.enum(['release', 'nightly', 'dev'] satisfies UpdateChannel[])

const savedSchema = z.object({
  channel: channels,
  later: z.object({ build: z.string(), until: z.number() }).optional(),
  dismissed: z.array(z.string()).default([]),
})

export const isChannel = (value: unknown): value is UpdateChannel => channels.safeParse(value).success

const read = async (file: string) => (await readState(file, data => savedSchema.safeParse(data).data)) ?? { channel: DEFAULT_UPDATE_CHANNEL, dismissed: [] }

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
