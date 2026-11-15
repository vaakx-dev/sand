import type { Kit } from '@sand/ui-kit/contract'
import { div } from '@vaakx-dev/vrui'
import type { Fleet } from '../fleet/model'
import { channelSection } from './channel'
import { latestSection } from './latest'
import { noticesSection } from './notices'
import { pcsSection } from './pcs'

export const updatesPage = (kit: Kit, fleet: Fleet, open: () => void): HTMLElement =>
  div({ class: 'flex flex-col gap-6' }, noticesSection(kit, fleet), latestSection(kit, fleet, open), pcsSection(kit, fleet), channelSection(kit, fleet))
