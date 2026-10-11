import type { HostRoute } from '@sand/host-gateway/contract'
import type { PcList, Remote } from '@sand/host-remotes/contract'
import type { TailscaleState } from '@sand/host-tailscale/contract'
import type { LoginState } from '@sand/llm-accounts/contract'
import { errorMessage, sig } from '@sand/dom'
import type { Context } from 'drydock'

const linkChanges = new Set(['network.change', 'tailscale.change', 'routes.change', 'pair.used'])

const ignore = () => {}

export const deviceSource = (ctx: Context<'wire'>) => {
  const pcs = sig<PcList | undefined>(undefined)
  const login = sig<LoginState | undefined>(undefined)
  const tailscale = sig<TailscaleState | undefined>(undefined)
  const routes = sig<HostRoute[] | undefined>(undefined)
  const epoch = sig(0)
  let wanted = false

  const fail = (error: unknown) => ctx.notify?.push(errorMessage(error), { level: 'error' })
  const bump = () => epoch.update(count => count + 1)

  const load = () => {
    wanted = true
    ctx.wire.call<PcList>({ type: 'pcs.list' }).then(list => pcs.set(list), fail)
    ctx.wire.call<LoginState>({ type: 'login.status' }).then(state => login.set(state), ignore)
    ctx.wire.call<TailscaleState>({ type: 'tailscale.get' }).then(state => tailscale.set(state), ignore)
    ctx.wire.call<HostRoute[]>({ type: 'host.routes' }).then(list => routes.set(list), ignore)
  }

  ctx.on('wire.hello', () => {
    bump()
    if (wanted) load()
  })
  ctx.on('wire.event', event => {
    if (event.name === 'pcs.change') pcs.set(event.args[0])
    if (event.name === 'login.change') login.set(event.args[0])
    if (event.name === 'tailscale.change') tailscale.set(event.args[0])
    if (event.name === 'routes.change') routes.set(event.args[0])
    if (linkChanges.has(event.name)) bump()
  })

  const remove = (id: string) => ctx.wire.call({ type: 'devices.remove', device: id })
  const rename = (id: string, name: string) => ctx.wire.call({ type: 'devices.rename', device: id, name })
  const removePc = async (id: string) => pcs.set(await ctx.wire.call<PcList>({ type: 'pcs.remove', pc: id }))
  const addPc = (link: string) => ctx.wire.call<Remote>({ type: 'remotes.add', link })
  const listenOnLan = () => ctx.wire.call({ type: 'network.set', lan: true }).catch(fail)
  const setHttps = async (https: boolean) => tailscale.set(await ctx.wire.call<TailscaleState>({ type: 'tailscale.set', https }))

  return { pcs, login, tailscale, routes, epoch, load, remove, rename, removePc, addPc, listenOnLan, setHttps, fail }
}

export type DeviceSource = ReturnType<typeof deviceSource>
