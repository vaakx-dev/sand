import { helloField, request, type, wireEvent } from '@sand/host-hub/contract'
import { z } from 'zod'

export interface Guess {
  turn: string
  text: string
}

export interface GuessesState {
  on: boolean
}

export const helloGuesses = helloField<GuessesState>('guesses')

export const guessesChange = wireEvent<GuessesState>('guesses.change')

export const guessesSet = request('guesses.set', { input: () => z.object({ on: z.boolean() }), output: type<void>() })

export const guessChange = wireEvent<[session: string, guess: Guess | null]>('guess.change')

export const guessRead = request('guess.read', { input: () => z.object({ session: z.string() }), output: type<Guess | null>(), place: 'thread' })
