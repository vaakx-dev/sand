import { div } from '@vaakx-dev/vrui'
import type { PcHealthStore } from '../health/state'
import type { DevicesContext } from '../inject'
import type { DeviceSource } from '../source'
import { awaySection } from './away'
import { pcsSection } from './pcs'
import { phonesSection } from './phones'

export interface PageActions {
  pair(): void
  addPc(): void
  pairAgain(): void
}

export const pcsPage = (ctx: DevicesContext, source: DeviceSource, health: PcHealthStore, actions: PageActions) => {
  source.load()
  return div(
    { class: 'flex flex-col gap-6' },
    pcsSection(ctx.kit, source, health, actions),
    phonesSection(ctx, source, actions.pair),
    awaySection(ctx, source),
  )
}
