import { llm } from '@sand/accounts/contract'
import { type Conversation, turnClose, turnOpen, type TurnInfo } from '@sand/engine/contract'
import { providerThreads } from '@sand/provider-threads/contract'
import { server } from '@sand/server/contract'
import { errorMessage } from '@sand/util'
import { definePlugin } from 'drydock'
import { guessNext } from './ask'
import { type Guess, guessChange, guessRead } from './contract'

const GUESS_TIMEOUT_MS = 60_000

export default definePlugin({
  name: 'guesses',
  description: "Guesses the next message as each turn of a thread or bot chat ends, with the chat's own model and prompt cache, for the composer to offer",
  inject: { llm, providerThreads },
  apply(ctx) {
    const guesses = new Map<string, Guess>()
    const asking = new Map<string, AbortController>()
    const unloaded = new AbortController()
    ctx.effect(() => () => unloaded.abort())

    const publish = (session: string, guess: Guess | null) => {
      if (guess) guesses.set(session, guess)
      else guesses.delete(session)
      ctx.get(server)?.broadcast(guessChange, [session, guess])
    }

    const forget = (session: string) => {
      asking.get(session)?.abort()
      asking.delete(session)
      if (guesses.has(session)) publish(session, null)
    }

    const guess = async (conversation: Conversation, turn: TurnInfo, signal: AbortSignal) => {
      const request = await ctx.providerThreads.view(conversation)
      const text = request && (await guessNext(ctx.llm, conversation, request, signal))
      if (text && !signal.aborted) publish(conversation.id, { turn: turn.id, text })
    }

    const start = (conversation: Conversation, turn: TurnInfo) => {
      const asked = new AbortController()
      asking.set(conversation.id, asked)
      const signal = AbortSignal.any([asked.signal, unloaded.signal, AbortSignal.timeout(GUESS_TIMEOUT_MS)])
      guess(conversation, turn, signal)
        .catch(error => {
          if (!signal.aborted) ctx.report(new Error(`Couldn't guess the next message in ${conversation.id}: ${errorMessage(error)}`))
        })
        .finally(() => {
          if (asking.get(conversation.id) === asked) asking.delete(conversation.id)
        })
    }

    ctx.on(turnOpen, conversation => forget(conversation.id))
    ctx.on(turnClose, (conversation, result, turn) => {
      if (result.stopReason === 'end_turn') start(conversation, turn)
    })
    ctx.watch(server, found => found?.handle(guessRead, ({ session }) => guesses.get(session) ?? null))
  },
})
