import { wire } from '@sand/devices-contract'
import { settings } from '@sand/settings/contract'
import { kit } from '@sand/ui-kit/contract'
import { effect, sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { locationAnswer, locationAsk, locationSettled } from '../contract'
import { readSharing, writeSharing } from './integrations/stored'
import { Locator } from './locator'
import { ITEM, locationSection } from './section'

const PAGE = 'addon:location'

export default definePlugin({
  name: 'location-web',
  description: "Answers a PC's location ask with this phone's or browser's precise position, once the system has allowed location, unless sharing is off for this device in Settings › Add-ons › Location",
  inject: { wire, kit },
  apply(ctx) {
    const sharing = sig(readSharing())
    const toggle = () => {
      sharing.set(!sharing.get())
      writeSharing(sharing.get())
    }
    ctx.watch(settings, found => found?.section({ page: PAGE, id: ITEM.id, items: [ITEM], render: () => locationSection({ kit: ctx.kit, sharing, toggle }) }))

    if (!('geolocation' in navigator)) return
    const locator = new Locator({
      geolocation: navigator.geolocation,
      sharing: () => sharing.get(),
      answer: (pc, id, fix) => void ctx.wire.call(locationAnswer, { id, fix }, pc).catch(error => ctx.report(error)),
    })
    ctx.effect(() => () => locator.stop())
    ctx.effect(() =>
      effect(() => {
        if (!sharing.get()) locator.stop()
      }),
    )
    ctx.effect(() => ctx.wire.on(locationAsk, ({ id }, pc) => locator.ask(id, pc), { from: 'all' }))
    ctx.effect(() => ctx.wire.on(locationSettled, ({ id }) => locator.settle(id), { from: 'all' }))
  },
})
