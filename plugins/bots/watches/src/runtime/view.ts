import type { Kind, Watch } from '@sand/watches/contract'
import { z } from 'zod'
import type { BotWatch } from '../contract'

export const owner = 'bots'

const content = z.object({ instructions: z.string() })

export const instructionsOf = (watch: Watch) => content.parse(watch.data).instructions

export const botWatchOf = (watch: Watch, kinds: Kind[]): BotWatch => {
  const { id, subject, label, kind, target, info, created, changed, error } = watch
  return {
    id,
    bot: subject,
    label,
    kind,
    kindLabel: kinds.find(found => found.name === kind)?.label ?? kind,
    target,
    instructions: instructionsOf(watch),
    ...(info && { info }),
    created,
    ...(changed !== undefined && { changed }),
    ...(error && { error }),
  }
}
