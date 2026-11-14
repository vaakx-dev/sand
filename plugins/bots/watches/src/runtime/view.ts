import type { Kind, Watch } from '@sand/watches/contract'
import { z } from 'zod'
import type { BotWatch } from '../contract'

export const owner = 'bots'

const content = z.object({ instructions: z.string(), job: z.string().optional() })

export const contentOf = (watch: Watch) => content.parse(watch.data)

export const botWatchOf = (watch: Watch, kinds: Kind[]): BotWatch => {
  const { id, subject, label, kind, target, info, created, changed, error } = watch
  return {
    id,
    bot: subject,
    label,
    kind,
    kindLabel: kinds.find(found => found.name === kind)?.label ?? kind,
    target,
    ...contentOf(watch),
    ...(info && { info }),
    created,
    ...(changed !== undefined && { changed }),
    ...(error && { error }),
  }
}
