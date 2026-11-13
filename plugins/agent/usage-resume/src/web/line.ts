import type { Kit } from '@sand/ui-kit/contract'
import { show, sig, span } from '@vaakx-dev/vrui'
import type { Alternative } from '../contract'

export interface LineParts {
  resetsAt?: number
  planned(): boolean
  cancel(): void
  alternative(): Promise<Alternative | undefined>
  switchTo(alternative: Alternative): Promise<void>
}

const UNKNOWN = 'Out of usage · Reset time unknown, so it won’t resume'

const sameDay = (at: number) => new Date(at).toDateString() === new Date().toDateString()

const resetText = (at: number) => {
  const time = new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return sameDay(at) ? time : `${new Date(at).toLocaleDateString([], { weekday: 'short' })} ${time}`
}

const lineText = (resetsAt: number, planned: boolean) => `Out of usage until ${resetText(resetsAt)}${planned ? ' · Resumes then' : ''}`

const switchButton = ({ linkButton }: Kit, { alternative, switchTo }: LineParts) => {
  const offered = sig<Alternative | undefined>(undefined)
  void alternative().then(found => offered.set(found))
  const press = () => {
    const chosen = offered.get()
    offered.set(undefined)
    if (chosen) void switchTo(chosen)
  }
  return show(
    () => offered.get() !== undefined,
    () =>
      linkButton(
        { class: 'text-xs', title: () => `Switch this thread to ${offered.get()?.label ?? ''} and continue now`, onClick: press },
        () => `Continue on ${offered.get()?.account ?? ''}`,
      ),
  )
}

export const limitLine = (kit: Kit, parts: LineParts) => {
  const { markerLine, linkButton } = kit
  const { resetsAt, planned, cancel } = parts
  if (!resetsAt) return markerLine({ icon: 'clock', tone: 'warning' }, span(UNKNOWN), switchButton(kit, parts))
  return markerLine(
    { icon: 'clock', tone: 'warning' },
    span(() => lineText(resetsAt, planned())),
    switchButton(kit, parts),
    show(planned, () => linkButton({ class: 'text-xs', onClick: cancel }, 'Cancel')),
  )
}
