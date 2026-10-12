import type { Kit } from '@sand/ui-kit/contract'
import { div } from '@vaakx-dev/vrui'
import type { Fleet } from '../fleet/model'
import { channelSection } from './channel'
import { latestSection } from './latest'
import { pcsSection } from './pcs'

export const updatesPage = (kit: Kit, fleet: Fleet, open: () => void): HTMLElement => {
  const { pageHead, secondaryAction } = kit
  return div(
    { class: 'flex flex-col gap-6' },
    pageHead(
      'Sand looks for new versions on GitHub and installs one only when you click Update.',
      secondaryAction({ size: 'sm', disabled: fleet.busy, onClick: () => void fleet.check() }, 'Check now'),
    ),
    latestSection(kit, fleet, open),
    pcsSection(kit, fleet),
    channelSection(kit, fleet),
  )
}
