import { derive, effect, stored, untrack } from '@vaakx-dev/vrui'
import { overlaySlot } from '../shared/overlay'
import type { Ui } from '../ui'
import { joinOfferSheet } from './sheet'

export const joinOffer = (ui: Ui) => {
  const dismissed = stored('sand.join-offer.dismissed', false)
  const slot = overlaySlot(ui.ctx, 110)
  const { data } = ui
  const alone = derive(() => {
    if (dismissed.get() || data.paired.get().phase !== 'paired' || !data.devices.records.loaded.get()) return false
    data.changes.version.get()
    const status = ui.ctx.pcs.get(data.homeId())?.status
    const ownScreen = status?.phase === 'connected' && status.route.kind === 'local'
    return ownScreen && !data.devices.live().some(record => record.kind === 'pc' && record.id !== data.homeId())
  })
  const offered = derive(() => alone.get() && data.joins.unpaired().length > 0)

  effect(() => {
    if (alone.get()) untrack(() => void data.joins.found.refresh())
  })

  const dismiss = () => {
    dismissed.set(true)
    slot.close()
  }

  effect(() => {
    const show = offered.get()
    untrack(() => {
      if (show && !slot.isOpen()) slot.open(() => joinOfferSheet(ui, dismiss, slot.close))
    })
  })
}
