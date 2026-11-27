import { wire } from '@sand/devices-contract'
import { definePlugin } from 'drydock'
import { locationAnswer, locationAsk, locationSettled } from '../contract'
import { Locator } from './locator'

export default definePlugin({
  name: 'location-web',
  description: "Answers a PC's location ask with this phone's or browser's precise position, once the system has allowed location",
  inject: { wire },
  apply(ctx) {
    if (!('geolocation' in navigator)) return
    const locator = new Locator(navigator.geolocation, (pc, id, fix) => {
      ctx.wire.call(locationAnswer, { id, fix }, pc).catch(error => ctx.report(error))
    })
    ctx.effect(() => () => locator.stop())
    ctx.effect(() => ctx.wire.on(locationAsk, ({ id }, pc) => locator.ask(id, pc), { from: 'all' }))
    ctx.effect(() => ctx.wire.on(locationSettled, ({ id }) => locator.settle(id), { from: 'all' }))
  },
})
