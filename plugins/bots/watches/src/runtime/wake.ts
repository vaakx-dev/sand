import type { BotTurns } from '@sand/bot-turns/contract'
import type { Job } from '@sand/bots/contract'
import type { Handler } from '@sand/watches/contract'
import { wakePrompt } from './prompt'
import { contentOf } from './view'

export const wakeBot =
  (turns: BotTurns, jobOf: (id: string) => Job | undefined): Handler =>
  async (watch, changes, signal) => {
    const { job } = contentOf(watch)
    const owned = job ? jobOf(job) : undefined
    if (owned?.paused) return
    const clientRequestId = `watch:${watch.id}:${Bun.hash(JSON.stringify(changes))}`
    const sent = await turns.send(watch.subject, { prompt: wakePrompt(watch, changes, owned), mode: 'queue', origin: 'wake', label: watch.label, clientRequestId })
    await turns.follow(watch.subject, sent, signal)
  }
