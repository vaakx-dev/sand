import { span } from '@vaakx-dev/vrui'
import { icon } from '../icons/lucide'
import { dot, okMark, spinner } from './marks'

export type StateMark = 'unread' | 'draft' | 'agent'

export type StepState = 'done' | 'failed' | 'running' | 'waiting'

const skyMark = (name: 'pencil' | 'bot') => span({ class: 'inline-flex shrink-0 text-sky-400' }, icon(name, 12))

const stateMarks: Record<StateMark, () => HTMLElement> = {
  unread: () => dot('orange'),
  draft: () => skyMark('pencil'),
  agent: () => skyMark('bot'),
}

const stepMarks: Record<StepState, () => HTMLElement> = {
  done: () => okMark(14),
  failed: () => span({ class: 'inline-flex shrink-0 text-danger-400' }, icon('x', 14)),
  running: () => spinner(14),
  waiting: () => span({ class: 'm-px h-3 w-3 shrink-0 rounded-full ring-1 ring-neutral-600' }),
}

export const stateMark = (kind: StateMark) => stateMarks[kind]()

export const stepMark = (state: StepState) => stepMarks[state]()
