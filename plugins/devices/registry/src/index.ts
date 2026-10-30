import { auth, devicesChange, helloDevice, helloPc, registry as registryService, thisPc as thisPcService } from '@sand/devices-contract'
import { loadPcIdentity } from '@sand/devices-identity/pc'
import { hostOptions } from '@sand/host-daemon/contract'
import { hostBuild } from '@sand/host-dist/contract'
import { hub, hubOpen } from '@sand/host-hub/contract'
import { definePlugin } from 'drydock'
import { createAuth } from './auth'
import { createRegistry } from './registry'
import { deviceRequests } from './requests'
import { loadSeen } from './seen/seen'
import { seenRequest, trackSeen } from './seen/track'
import { loadDeviceFile } from './store/file'
import { createThisPc } from './this-pc'

export default definePlugin({
  name: 'devices-registry',
  description: 'The device list shared by your PCs, this PC and who each caller is',
  inject: { hostOptions, hub },
  async apply(ctx) {
    const { home, name } = ctx.hostOptions
    const registry = createRegistry(await loadDeviceFile(home))
    const thisPc = await createThisPc({
      keys: await loadPcIdentity(home),
      name,
      registry,
      build: async () => ctx.get(hostBuild)?.info(),
    })
    void thisPc.identity()

    ctx.effect(() => registry.onChange(() => ctx.hub.broadcast(devicesChange, registry.list(), 'user')))
    ctx.effect(() => ctx.hub.greet(helloPc, () => thisPc.current()))
    ctx.effect(() =>
      ctx.hub.greet(helloDevice, caller => {
        const record = registry.get(caller.device)
        return record && !record.removed ? record : undefined
      }),
    )
    for (const register of deviceRequests(ctx.hub, registry, thisPc)) ctx.effect(register)

    const seen = await loadSeen(home)
    ctx.on(hubOpen, device => seen.touch([device]))
    ctx.effect(() => trackSeen(ctx.hub, seen))
    ctx.effect(seenRequest(ctx.hub, registry, seen))

    ctx.provide(registryService, registry)
    ctx.provide(thisPcService, thisPc)
    ctx.provide(auth, createAuth(registry, thisPc))
  },
})
