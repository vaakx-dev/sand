import type { ChatRef, Suggestion } from '@sand/composer/contract'
import type { Wire } from '@sand/devices-contract'
import { sig } from '@vaakx-dev/vrui'
import { type Guess, guessChange, guessRead } from '../contract'

export const createGuesses = (wire: Wire) => {
  const known = sig(new Map<string, Guess | null>())
  const dismissed = sig(new Set<string>())
  const asked = new Set<string>()

  const put = (session: string, guess: Guess | null) => known.update(all => new Map(all).set(session, guess))

  const load = ({ id, pc }: ChatRef) => {
    if (asked.has(id)) return
    asked.add(id)
    void wire.call(guessRead, { session: id }, pc).then(
      guess => put(id, guess),
      () => asked.delete(id),
    )
  }

  const suggestion = (guess: Guess): Suggestion => ({ text: guess.text, dismiss: () => dismissed.update(all => new Set(all).add(guess.turn)) })

  return {
    listen: () => wire.on(guessChange, ([session, guess]) => put(session, guess), { from: 'all' }),
    reset() {
      asked.clear()
      known.set(new Map())
    },
    of(chat: ChatRef) {
      load(chat)
      const guess = known.get().get(chat.id)
      return guess && !dismissed.get().has(guess.turn) ? suggestion(guess) : undefined
    },
  }
}
