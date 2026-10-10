import { dynamicChild, span, type Sig } from '@sand/dom'
import type { Thread } from '@sand/web-client/contract'

const segmentLimit = 8

const tone = (agent: Thread) => {
  if (agent.running) return 'bg-sky-400'
  if (agent.ended?.stopReason === 'error') return 'bg-danger-400'
  if (agent.ended?.stopReason === 'interrupted') return 'bg-neutral-600'
  return 'bg-success-400'
}

const segments = (tones: string[]) =>
  span(
    { class: ['shrink-0 gap-px', tones.length ? 'flex' : 'hidden'] },
    tones.map(value => span({ class: ['h-1 w-2 rounded-full', value] })),
  )

const counted = (agents: Thread[]) => `${agents.filter(agent => !agent.running).length}/${agents.length}`

export const progress = (agents: Sig<Thread[]>) =>
  dynamicChild(
    agents.map(list => (list.length > segmentLimit ? 'count' : list.map(tone).join(' '))),
    key => (key === 'count' ? span({ class: 'shrink-0 tabular-nums' }, agents.map(counted)) : segments(key ? key.split(' ') : [])),
  )
