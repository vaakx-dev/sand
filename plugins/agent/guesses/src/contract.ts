import { request, type, wireEvent } from '@sand/host-hub/contract'
import { z } from 'zod'

export interface Guess {
  turn: string
  text: string
}

export const guessChange = wireEvent<[session: string, guess: Guess | null]>('guess.change')

export const guessRead = request('guess.read', { input: () => z.object({ session: z.string() }), output: type<Guess | null>(), place: 'thread' })
