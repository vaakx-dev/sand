import type { Entry, Message } from '@sand/protocol'
import { promptText } from '@sand/kit'
import { isPrompt, type LabelData } from './describe'

export interface Move {
  at: string | null
  draft?: string
}

export interface Branching<T> {
  head: string | null
  path(): Entry[]
  checkout(at: string | null): unknown
  branch(at: string | null): T | Promise<T>
}

export const moveOf = (entry: Entry): Move =>
  isPrompt(entry) ? { at: entry.parent, draft: promptText(entry.data as Message) } : { at: entry.id }

export const movedNote = (move: Move) => (move.draft === undefined ? 'Moved to the selected point' : 'Moved to before this prompt')

export const forkedNote = 'Forked into a new thread.'

export const busyNote = 'Wait for the current turn to finish'

export const forkAt = async <T>(source: Branching<T>, at: string | null) => {
  const head = source.head
  const onPath = at === null || source.path().some(entry => entry.id === at)
  if (onPath) return source.branch(at)
  await source.checkout(at)
  try {
    return await source.branch(at)
  } finally {
    await source.checkout(head)
  }
}

export const labelData = (target: string, text: string): LabelData => ({ target, label: text.trim() || null })
