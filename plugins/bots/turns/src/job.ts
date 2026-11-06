import { type Bots, jobEntry, type JobEntry } from '@sand/bots/contract'
import type { Engine } from '@sand/engine/contract'
import type { Actor } from '@sand/host-hub/contract'
import type { McpTool } from '@sand/mcp-server/contract'
import { failure } from '@sand/orchestrator/contract'
import { z } from 'zod'
import { botSetJob, jobLimit } from './contract'

const input = z.object({
  job: z.string().min(1).max(jobLimit).describe('Your whole job, replacing the one you have'),
  name: z.string().min(1).max(60).optional().describe('A short name for yourself, when you have none yet'),
})

const description = `Write your job: the standing instructions you get with every message. Write it once you know what the user wants you for, and after that only when the user asks you to change it.

- Write to yourself in the second person: "You keep the user's calendar and plan their days."
- Say what you take care of, when to check with the user before you act, and how to reply.
- Keep it short: a line on what you're for and a few bullets, well under ${jobLimit.toLocaleString('en')} characters.
- Leave out facts about the user, like names, places and preferences. Those go in your memory.

The user sees the job in the chat and can edit or undo it.`

export const jobTool: McpTool<typeof input> = {
  name: 'set_job',
  description,
  input,
  access: 'operate',
  agents: ['bot'],
  run: (given, { call }) => call(botSetJob, given),
}

export const setJob = (bots: Bots, engine: Engine, actor: Actor | undefined, { job, name }: { job: string; name?: string }) => {
  const bot = actor?.owner === 'bot' ? bots.get(actor.id) : undefined
  if (!bot) throw failure('invalid_request', 'Only a bot can set its own job')
  const set = bots.update(bot.id, { job, ...(name && !bot.name && { name }) })
  const turn = engine.turn('bot', bot.id)?.id
  bots.conversation(bot.id).append(jobEntry, { job, previous: bot.job } satisfies JobEntry, turn ? { turn } : {})
  return { name: set.name, job: set.job }
}
