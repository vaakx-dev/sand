import type { HostRoute, LoginState, NetworkState, PairInvite, PcList, Remote, TailscaleState } from '@sand/protocol'
import { effect, errorMessage, onTimeout, sig, untrack, type Sig } from '@sand/dom'
import type { Context } from 'drydock'

const renewMargin = 30_000
const minRenew = 60_000

const renewDelay = (expires: number) => Math.max(expires - Date.now() - renewMargin, minRenew)

export const deviceSource = (ctx: Context<'wire'>) => {
  const pcs = sig<PcList | undefined>(undefined)
  const login = sig<LoginState | undefined>(undefined)
  const network = sig<NetworkState | undefined>(undefined)
  const tailscale = sig<TailscaleState | undefined>(undefined)
  const routes = sig<HostRoute[] | undefined>(undefined)
  const epoch = sig(0)
  let wanted = false

  const fail = (error: unknown) => ctx.notify?.push(errorMessage(error), { level: 'error' })
  const bump = () => epoch.update(count => count + 1)

  const load = () => {
    wanted = true
    ctx.wire.call<PcList>({ type: 'pcs.list' }).then(list => pcs.set(list), fail)
    ctx.wire.call<LoginState>({ type: 'login.status' }).then(
      state => login.set(state),
      () => undefined,
    )
    ctx.wire.call<NetworkState>({ type: 'network.get' }).then(state => network.set(state), fail)
    ctx.wire.call<TailscaleState>({ type: 'tailscale.get' }).then(
      state => tailscale.set(state),
      () => undefined,
    )
    ctx.wire.call<HostRoute[]>({ type: 'host.routes' }).then(
      list => routes.set(list),
      () => undefined,
    )
  }

  ctx.on('wire.hello', () => {
    bump()
    if (wanted) load()
  })
  ctx.on('wire.event', event => {
    if (event.name === 'pcs.change') pcs.set(event.args[0])
    if (event.name === 'login.change') login.set(event.args[0])
    if (event.name === 'network.change') {
      network.set(event.args[0])
      bump()
    }
    if (event.name === 'tailscale.change') {
      tailscale.set(event.args[0])
      bump()
    }
    if (event.name === 'routes.change') {
      routes.set(event.args[0])
      bump()
    }
    if (event.name === 'pair.used') bump()
  })

  const remove = (id: string) => ctx.wire.call({ type: 'devices.remove', device: id })
  const rename = (id: string, name: string) => ctx.wire.call({ type: 'devices.rename', device: id, name })
  const removePc = async (id: string) => pcs.set(await ctx.wire.call<PcList>({ type: 'pcs.remove', pc: id }))
  const addPc = (link: string) => ctx.wire.call<Remote>({ type: 'remotes.add', link })
  const setLan = async (lan: boolean) => network.set(await ctx.wire.call<NetworkState>({ type: 'network.set', lan }))
  const setHttps = async (https: boolean) => tailscale.set(await ctx.wire.call<TailscaleState>({ type: 'tailscale.set', https }))

  return { pcs, login, network, tailscale, routes, epoch, load, remove, rename, removePc, addPc, setLan, setHttps, fail }
}

export type DeviceSource = ReturnType<typeof deviceSource>

export const pairInvite = (ctx: Context<'wire'>, epoch: Sig<number>, shown: Set<number>) => {
  const invite = sig<PairInvite | undefined>(undefined)
  const error = sig<unknown>(undefined)
  const renew = sig(0)
  effect(() => {
    epoch.get()
    renew.get()
    let current = true
    untrack(() =>
      ctx.wire.call<PairInvite>({ type: 'pair.create' }).then(
        next => {
          if (!current) return
          shown.add(next.expires)
          invite.set(next)
        },
        failure => {
          if (current) error.set(failure)
        },
      ),
    )
    return () => {
      current = false
    }
  })
  effect(() => {
    const active = invite.get()
    if (active) onTimeout(() => renew.update(count => count + 1), renewDelay(active.expires))
  })
  return { invite, error }
}
