import { textOf, type Entry, type Message } from '@sand/chats/contract'
import type { TurnEnding } from '@sand/engine/contract'
import type { Thread } from '@sand/web-client/contract'

export type Answer = { kind: 'working' } | { kind: 'looking' } | { kind: 'reply'; text: string } | { kind: 'note'; text: string }

const endings: Partial<Record<TurnEnding['stopReason'], string>> = {
  interrupted: 'Stopped',
  error: "Couldn't answer",
  lost: "Couldn't answer",
}

const note = (text: string): Answer => ({ kind: 'note', text })

const spokenOf = ({ type, data }: Entry) => {
  const message = type === 'message' ? (data as Message) : undefined
  return message?.role === 'assistant' ? textOf(message.content, '\n\n').trim() : ''
}

const endingOf = (entries: Entry[]) => {
  const ending = entries.find(entry => entry.type === 'turn-ending')
  return ending && endings[(ending.data as TurnEnding).stopReason]
}

const ongoing = (thread: Thread, path: Entry[], turn: string) => thread.turn && path.findLast(entry => entry.turn)?.turn === turn

const unstarted = (thread: Thread, older: boolean): Answer => {
  if (thread.turn || thread.pending.length) return note('Waiting its turn')
  return older ? { kind: 'looking' } : note('No reply')
}

export const answerOf = (thread: Thread | undefined, path: Entry[], { turn, older }: { turn?: string; older: boolean }): Answer => {
  if (!turn) return note('Waiting its turn')
  if (!thread) return { kind: 'looking' }
  const own = path.filter(entry => entry.turn === turn)
  if (!own.length) return unstarted(thread, older)
  if (ongoing(thread, path, turn)) return thread.waiting ? note('Needs you in its chat') : { kind: 'working' }
  const reply = own.map(spokenOf).findLast(Boolean)
  if (reply) return { kind: 'reply', text: reply }
  return note(endingOf(own) ?? 'No reply')
}
