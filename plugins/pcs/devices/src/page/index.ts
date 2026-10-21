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
  const { icon, pageHead, secondaryAction } = ctx.kit
  source.load()
  return div(
    { class: 'flex flex-col gap-6' },
    pageHead("PCs you pair can use each other's shared accounts.", secondaryAction({ size: 'sm', onClick: actions.addPc }, icon('plus', 14), 'Add a PC')),
    pcsSection(ctx.kit, source, health, actions.pairAgain),
    phonesSection(ctx, source, actions.pair),
    awaySection(ctx, source),
  )
}
