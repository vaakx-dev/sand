import type { PcTone } from '@sand/devices-contract'
import type { Kit, Tone } from '@sand/ui-kit/contract'
import { dynamicChild, span } from '@vaakx-dev/vrui'

const filled: Record<Exclude<PcTone, 'off'>, Tone> = { ok: 'success', wait: 'warning', bad: 'danger' }

const ring = () => span({ class: 'h-2 w-2 shrink-0 rounded-full text-neutral-400 ring-1 ring-current ring-inset' })

export const toneDot = (kit: Kit, tone: () => PcTone, label: () => string) =>
  span(
    { class: 'inline-flex shrink-0', role: 'img', 'aria-label': label, title: label },
    dynamicChild(tone, current => (current === 'off' ? ring() : kit.dot(filled[current]))),
  )
