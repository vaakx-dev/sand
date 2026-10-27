import { span } from '@vaakx-dev/vrui'
import { icon } from '../icons/lucide'
import { okMark, spinner } from './marks'

export type StepState = 'done' | 'failed' | 'running' | 'waiting'

const stepMarks: Record<StepState, () => HTMLElement> = {
  done: () => okMark('sm'),
  failed: () => span({ class: 'inline-flex shrink-0 text-danger-400' }, icon('x', 'sm')),
  running: () => spinner('sm'),
  waiting: () => span({ class: 'm-px h-3 w-3 shrink-0 rounded-full ring-1 ring-neutral-700' }),
}

export const stepMark = (state: StepState) => stepMarks[state]()
