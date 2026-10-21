import { hostOptions } from '@sand/host-daemon/contract'
import { hostBuild, type HostBuild } from '@sand/host-dist/contract'
import { hub } from '@sand/host-hub/contract'
import { definePlugin } from 'drydock'
import { hostDevices } from './contract'
import { createInvites } from './invites'
import { deviceRequests } from './requests'
import { createHostDevices } from './service'
import { loadDeviceStore } from './store'

const seenEvery = 5 * 60_000

export default definePlugin({
  name: 'host-devices',
  description: 'Paired devices: their keys, one-time pairing secrets and the device list',
  inject: { hostOptions, hub },
  async apply(ctx) {
    const store = await loadDeviceStore(ctx.hostOptions.home)
    const devices = createHostDevices(store, createInvites(), ctx.hub)
    let build: HostBuild | undefined
    ctx.watch(hostBuild, impl => {
      build = impl
    })
    for (const register of deviceRequests(ctx.hub, devices, ctx.hostOptions.device, async () => build?.info())) ctx.effect(register)
    ctx.effect(() => {
      const timer = setInterval(() => devices.seen(ctx.hub.devices()), seenEvery)
      return () => clearInterval(timer)
    })
    ctx.provide(hostDevices, devices)
  },
})
