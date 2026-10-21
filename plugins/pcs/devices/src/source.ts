import { loginChange, loginStatus, type LoginState } from '@sand/accounts/contract'
import { devicesRemove, devicesRename, pairUsed } from '@sand/host-devices/contract'
import { hostRoutes, networkChange, networkSet, routesChange, type HostRoute } from '@sand/host-gateway/contract'
import { pcsChange, pcsList, pcsRemove, remotesAdd, type PcList } from '@sand/host-remotes/contract'
import { tailscaleChange, tailscaleGet, tailscaleSet, type TailscaleState } from '@sand/host-tailscale/contract'
import { wireHello } from '@sand/web-client/contract'
import { sig } from '@vaakx-dev/vrui'
import type { WireContext } from './inject'

const ignore = () => {}

export const deviceSource = (ctx: WireContext) => {
  const pcs = sig<PcList | undefined>(undefined)
  const login = sig<LoginState | undefined>(undefined)
  const tailscale = sig<TailscaleState | undefined>(undefined)
  const routes = sig<HostRoute[] | undefined>(undefined)
  const epoch = sig(0)
  let wanted = false

  const bump = () => epoch.update(count => count + 1)

  const load = () => {
    wanted = true
    ctx.wire.call(pcsList, {}).then(list => pcs.set(list), ignore)
    ctx.wire.call(loginStatus, {}).then(state => login.set(state), ignore)
    ctx.wire.call(tailscaleGet, {}).then(state => tailscale.set(state), ignore)
    ctx.wire.call(hostRoutes, {}).then(list => routes.set(list), ignore)
  }

  ctx.on(wireHello, () => {
    bump()
    if (wanted) load()
  })
  ctx.effect(() => ctx.wire.on(pcsChange, list => pcs.set(list)))
  ctx.effect(() => ctx.wire.on(loginChange, state => login.set(state)))
  ctx.effect(() =>
    ctx.wire.on(tailscaleChange, state => {
      tailscale.set(state)
      bump()
    }),
  )
  ctx.effect(() =>
    ctx.wire.on(routesChange, list => {
      routes.set(list)
      bump()
    }),
  )
  ctx.effect(() => ctx.wire.on(networkChange, bump))
  ctx.effect(() => ctx.wire.on(pairUsed, bump))

  const remove = (id: string) => ctx.wire.call(devicesRemove, { device: id })
  const rename = (id: string, name: string) => ctx.wire.call(devicesRename, { device: id, name })
  const removePc = async (id: string) => pcs.set(await ctx.wire.call(pcsRemove, { pc: id }))
  const addPc = (link: string) => ctx.wire.call(remotesAdd, { link })
  const listenOnLan = () => ctx.wire.call(networkSet, { lan: true }).catch(ignore)
  const setHttps = async (https: boolean) => tailscale.set(await ctx.wire.call(tailscaleSet, { https }))

  return { pcs, login, tailscale, routes, epoch, load, remove, rename, removePc, addPc, listenOnLan, setHttps }
}

export type DeviceSource = ReturnType<typeof deviceSource>
