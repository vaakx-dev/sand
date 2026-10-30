import {
  type NetworkScope,
  type NetworkState,
  networkChange,
  networkGet,
  networkSet,
  type TailscaleState,
  tailscaleChange,
  tailscaleGet,
  tailscaleSet,
} from '@sand/devices-contract'
import { effect } from '@vaakx-dev/vrui'
import type { UiContext } from '../inject'
import { feed } from './feed'

export const pcSettings = (ctx: UiContext, pc: string) => {
  const network = feed<NetworkState | undefined>(() => ctx.wire.call(networkGet, {}, pc), undefined)
  const tailscale = feed<TailscaleState | undefined>(() => ctx.wire.call(tailscaleGet, {}, pc), undefined)

  effect(() => ctx.wire.on(networkChange, (state, from) => from === pc && network.value.set(state), { from: 'all' }))
  effect(() => ctx.wire.on(tailscaleChange, (state, from) => from === pc && tailscale.value.set(state), { from: 'all' }))

  return {
    pc,
    network,
    tailscale,
    refresh: () => Promise.all([network.refresh(), tailscale.refresh()]),
    async setScope(scope: NetworkScope) {
      network.value.set(await ctx.wire.call(networkSet, { scope }, pc))
    },
    async setHttps(https: boolean) {
      tailscale.value.set(await ctx.wire.call(tailscaleSet, { https }, pc))
    },
  }
}

export type PcSettings = ReturnType<typeof pcSettings>
