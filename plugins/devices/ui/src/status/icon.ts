import type { PcIcon, PcTone } from '@sand/devices-contract'
import type { Kit } from '@sand/ui-kit/contract'
import { dynamicChild, span } from '@vaakx-dev/vrui'
import { iconKinds } from '../icon/kinds'

export const toneIcon = (kit: Kit, kind: () => PcIcon, tone: () => PcTone, label: () => string) =>
  span(
    { class: () => ['inline-flex shrink-0', tone() === 'ok' ? 'text-neutral-500' : 'text-warning-400'], role: 'img', 'aria-label': label, title: label },
    dynamicChild(kind, current => kit.icon(iconKinds[current].glyph, 'sm')),
  )
