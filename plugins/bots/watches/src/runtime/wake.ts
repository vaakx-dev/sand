import type { BotTurns } from '@sand/bot-turns/contract'
import type { Handler } from '@sand/watches/contract'
import { wakePrompt } from './prompt'

export const wakeBot =
  (turns: BotTurns): Handler =>
  async (watch, changes, signal) => {
    const clientRequestId = `watch:${watch.id}:${Bun.hash(JSON.stringify(changes))}`
    const sent = await turns.send(watch.subject, { prompt: wakePrompt(watch, changes), mode: 'queue', origin: 'wake', label: watch.label, clientRequestId })
    await turns.follow(watch.subject, sent, signal)
  }
