import { registry } from '@sand/devices-contract'
import { hub } from '@sand/host-hub/contract'
import { definePlugin } from 'drydock'
import { locationDeviceName } from '../contract'

export default definePlugin({
  name: 'location-host',
  description: 'Names the phone or browser that shared a location, from the device list',
  inject: { hub, registry },
  apply(ctx) {
    ctx.effect(() => ctx.hub.handle(locationDeviceName, ({ device }) => ctx.registry.get(device)?.name))
  },
})
