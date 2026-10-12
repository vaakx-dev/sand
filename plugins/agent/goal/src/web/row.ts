import type { Entry } from '@sand/messages'
import type { Kit, MarkerProps } from '@sand/ui-kit/contract'
import { span } from '@vaakx-dev/vrui'
import type { Goal } from '../goal'

export const goalRow = ({ markerLine }: Kit, entry: Entry) => {
  const line = (props: MarkerProps, text: string) => markerLine(props, span({ class: 'min-w-0 truncate', title: text }, text))
  const goal = entry.data as Goal
  if (goal.status === 'met') return line({ icon: 'check', tone: 'success' }, `Goal met: ${goal.objective}`)
  if (goal.status === 'cleared') return line({ icon: 'x' }, `Goal cleared: ${goal.objective}`)
  return goal.checks ? undefined : line({ icon: 'goal', tone: 'accent' }, `Goal set: ${goal.objective}`)
}
