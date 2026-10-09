import type { HostBuild } from '@sand/host-dist/contract'
import { definePlugin } from 'drydock'
import { createInvites } from './invites'
import { deviceRequests } from './requests'
import { createHostDevices } from './service'
import { loadDeviceStore } from './store'

const seenEvery = 5 * 60_000

export default definePlugin({
  name: 'host-devices',
  description: 'Paired devices: their keys, one-time pairing secrets and the device list',
  inject: ['hostOptions', 'hub'],
  async apply(ctx) {
    const store = await loadDeviceStore(ctx.hostOptions.home)
    const devices = createHostDevices(store, createInvites(), ctx.hub)
    let hostBuild: HostBuild | undefined
    ctx.watch('hostBuild', impl => {
      hostBuild = impl
    })
    for (const register of deviceRequests(ctx.hub, devices, ctx.hostOptions.device, async () => hostBuild?.info())) ctx.effect(register)
    ctx.effect(() => {
      const timer = setInterval(() => devices.seen(ctx.hub.devices()), seenEvery)
      return () => clearInterval(timer)
    })
    ctx.provide('hostDevices', devices)
  },
})
