import type { Bots } from '@sand/bots/contract'
import type { OwnerKind } from '@sand/orchestrator/contract'
import type { BotTurns } from './contract'

const soleProject = (projects: string[]) => (projects.length === 1 ? projects[0] : undefined)

export const botOwner = (bots: Bots, turns: BotTurns): OwnerKind => ({
  deliver: (bot, { text, clientRequestId }) => bots.get(bot) && turns.send(bot, { prompt: text, origin: 'job', clientRequestId }),
  label: bot => bots.get(bot)?.name || undefined,
  history: bot => (bots.get(bot) ? bots.conversation(bot).entries() : undefined),
  project: bot => soleProject(bots.get(bot)?.projects ?? []),
  folder: bot => (bots.get(bot) ? bots.folder(bot) : undefined),
})
