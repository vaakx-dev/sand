import type { Kit } from '@sand/ui-kit/contract'
import { div } from '@vaakx-dev/vrui'
import type { AppUpdate } from '../app/update'
import type { Fleet } from '../fleet/model'
import { appSection } from './app'
import { channelSection } from './channel'
import { latestSection } from './latest'
import { noticesSection } from './notices'
import { pcsSection } from './pcs'

export const updatesPage = (kit: Kit, fleet: Fleet, open: () => void, app: AppUpdate | undefined): HTMLElement =>
  div(
    { class: 'flex flex-col gap-6' },
    noticesSection(kit, fleet),
    latestSection(kit, fleet, open),
    app && appSection(kit, app),
    pcsSection(kit, fleet),
    channelSection(kit, fleet),
  )
