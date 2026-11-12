import { llm } from '@sand/accounts/contract'
import { type Conversation, turnClose, turnOpen, type TurnInfo } from '@sand/engine/contract'
import { paths } from '@sand/paths/contract'
import { providerThreads } from '@sand/provider-threads/contract'
import { server } from '@sand/server/contract'
import { errorMessage, joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { guessNext } from './ask'
import { type Guess, guessChange, guessesChange, guessesSet, guessRead, helloGuesses } from './contract'
import { createStore } from './store'

const GUESS_TIMEOUT_MS = 60_000

export default definePlugin({
  name: 'guesses',
  description: "Guesses the next message as each turn of a thread or bot chat ends, with the chat's own model and prompt cache, for the composer to offer",
  inject: { llm, providerThreads, paths },
  async apply(ctx) {
    const store = await createStore(join(ctx.paths.home, 'guesses.json'))
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

    const turnOff = () => [...asking.keys(), ...guesses.keys()].forEach(forget)

    const choose = async (on: boolean) => {
      await store.save({ on })
      if (!on) turnOff()
      ctx.get(server)?.broadcast(guessesChange, store.get())
    }

    ctx.on(turnOpen, conversation => forget(conversation.id))
    ctx.on(turnClose, (conversation, result, turn) => {
      if (store.get().on && result.stopReason === 'end_turn') start(conversation, turn)
    })
    ctx.watch(server, found =>
      found
        ? joinDisposers(
            found.hello(helloGuesses, store.get),
            found.handle(guessesSet, ({ on }) => choose(on)),
            found.handle(guessRead, ({ session }) => guesses.get(session) ?? null),
          )
        : undefined,
    )
  },
})
