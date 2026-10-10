import { dynamicChild, span, type Sig } from '@sand/dom'
import type { AgentRun, Thread } from '@sand/web-client/contract'

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

export const progress = (run: Sig<AgentRun>) =>
  dynamicChild(
    run.map(({ agents }) => (agents.length > segmentLimit ? 'count' : agents.map(tone).join(' '))),
    key =>
      key === 'count'
        ? span({ class: 'shrink-0 tabular-nums' }, run.map(value => `${value.finished}/${value.agents.length}`))
        : segments(key ? key.split(' ') : []),
  )
