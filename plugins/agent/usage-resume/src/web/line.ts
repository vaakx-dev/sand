import type { Kit } from '@sand/ui-kit/contract'
import { show, span } from '@vaakx-dev/vrui'

export interface LineParts {
  resetsAt?: number
  planned(): boolean
  cancel(): void
}

const UNKNOWN = 'Out of usage · Reset time unknown, so it won’t resume'

const sameDay = (at: number) => new Date(at).toDateString() === new Date().toDateString()

const resetText = (at: number) => {
  const time = new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return sameDay(at) ? time : `${new Date(at).toLocaleDateString([], { weekday: 'short' })} ${time}`
}

const lineText = (resetsAt: number, planned: boolean) => `Out of usage until ${resetText(resetsAt)}${planned ? ' · Resumes then' : ''}`

export const limitLine = ({ markerLine, linkButton }: Kit, { resetsAt, planned, cancel }: LineParts) => {
  if (!resetsAt) return markerLine({ icon: 'clock', tone: 'warning' }, span(UNKNOWN))
  return markerLine(
    { icon: 'clock', tone: 'warning' },
    span(() => lineText(resetsAt, planned())),
    show(planned, () => linkButton({ class: 'text-xs', onClick: cancel }, 'Cancel')),
  )
}
