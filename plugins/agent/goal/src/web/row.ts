import type { Entry } from '@sand/messages'
import { div, icon, span } from '@sand/dom'
import type { Goal } from '../goal'

const line = (tone: string, symbol: string, text: string) =>
  div(
    { class: ['mt-2 mb-4 flex items-center justify-center gap-2 text-xs', tone] },
    span({ class: 'inline-flex shrink-0' }, icon(symbol, 13)),
    span({ class: 'min-w-0 truncate', title: text }, text),
  )

export const goalRow = (entry: Entry) => {
  const goal = entry.data as Goal
  if (goal.status === 'met') return line('text-success-400', 'check', `Goal met: ${goal.objective}`)
  if (goal.status === 'cleared') return line('text-neutral-500', 'x', `Goal cleared: ${goal.objective}`)
  return goal.checks ? undefined : line('text-neutral-400', 'goal', `Goal set: ${goal.objective}`)
}
