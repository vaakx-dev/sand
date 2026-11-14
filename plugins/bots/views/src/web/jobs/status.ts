import type { JobStatus } from '@sand/bots/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { type Child, span } from '@vaakx-dev/vrui'

const LABELS: Record<JobStatus, string> = { needs: 'Needs you', on: 'On track', paused: 'Paused' }

const statusMark = (kit: Kit, status: JobStatus) => {
  switch (status) {
    case 'needs':
      return kit.stateIcon('waiting', 'sm', true)
    case 'paused':
      return kit.stateIcon('idle')
    case 'on':
      return kit.stateIcon('settled')
  }
}

const statusTag = (kit: Kit, status: JobStatus) =>
  span(
    { class: ['flex shrink-0 items-center gap-1.5 text-xs', status === 'needs' ? 'font-medium text-neutral-100' : 'text-neutral-500'] },
    statusMark(kit, status),
    LABELS[status],
  )

const prose = (tone: string, ...children: Child[]) => span({ class: ['min-w-0 text-sm leading-relaxed wrap-anywhere', tone] }, ...children)

export { prose, statusMark, statusTag }
