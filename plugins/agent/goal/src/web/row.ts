import type { Entry } from '@sand/messages'
import { markerLine, span, type MarkerProps } from '@sand/dom'
import type { Goal } from '../goal'

const line = (props: MarkerProps, text: string) => markerLine(props, span({ class: 'min-w-0 truncate', title: text }, text))

export const goalRow = (entry: Entry) => {
  const goal = entry.data as Goal
  if (goal.status === 'met') return line({ icon: 'check', tone: 'success' }, `Goal met: ${goal.objective}`)
  if (goal.status === 'cleared') return line({ icon: 'x' }, `Goal cleared: ${goal.objective}`)
  return goal.checks ? undefined : line({ icon: 'goal', tone: 'accent' }, `Goal set: ${goal.objective}`)
}
