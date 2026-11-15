import type { Job } from '@sand/bots/contract'
import type { Session } from '@sand/chats/contract'
import type { Turns } from '@sand/turns-contract/contract'
import type { Handler } from '@sand/watches/contract'
import { wakePrompt } from './prompt'
import { contentOf } from './view'

export const wakeBot =
  (turns: Turns, chatOf: (bot: string) => Session | undefined, jobOf: (id: string) => Job | undefined): Handler =>
  async (watch, changes, signal) => {
    const { job } = contentOf(watch)
    const owned = job ? jobOf(job) : undefined
    const chat = chatOf(watch.subject)
    if (owned?.paused || !chat) return
    const clientRequestId = `watch:${watch.id}:${Bun.hash(JSON.stringify(changes))}`
    const sent = await turns.send(chat, { prompt: wakePrompt(watch, changes, owned), mode: 'queue', origin: 'wake', label: watch.label, clientRequestId })
    await turns.follow(chat, sent, signal)
  }
