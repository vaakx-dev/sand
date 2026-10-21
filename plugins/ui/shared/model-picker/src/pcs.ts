import { pcsChange, pcsList, type PcList } from '@sand/host-remotes/contract'
import { turnEndWire, type TurnResult } from '@sand/loop/contract'
import { wire, wireHello } from '@sand/web-client/contract'
import { effect, onTimeout, sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'

const recheck = 60_000

export const pcStatus = (ctx: Context) => {
  const online = sig<Record<string, boolean>>({})
  const down = sig(new Set<string>())
  const apply = (list: PcList) => online.set(Object.fromEntries(list.pcs.filter(pc => pc.checked).map(pc => [pc.name, pc.online && pc.pairing !== 'refused'])))
  const load = () => void ctx.get(wire)?.call(pcsList, {}).then(apply, () => undefined)
  const recover = () => {
    down.set(new Set())
    load()
  }
  const ended = ({ stopReason, error }: TurnResult) => {
    if (stopReason !== 'error' || !error) {
      if (down.get().size) recover()
      return
    }
    const name = Object.keys(online.get()).find(name => error.startsWith(`${name} is offline`))
    if (name) down.update(names => new Set([...names, name]))
    load()
  }
  ctx.watch(wire, found => {
    if (!found) return
    const stops = [
      found.on(pcsChange, list => {
        down.set(new Set())
        apply(list)
      }),
      found.on(turnEndWire, ([, result]) => ended(result)),
    ]
    if (found.state() === 'open') load()
    return () => {
      for (const stop of stops) void stop()
    }
  })
  effect(() => {
    if (down.get().size) return onTimeout(recover, recheck)
  })
  ctx.on(wireHello, load)
  const status = (name: string): boolean | undefined => (down.get().has(name) ? false : online.get()[name])
  return {
    online: status,
    key: () => JSON.stringify([online.get(), [...down.get()]]),
    refresh: load,
  }
}

export type PcStatus = ReturnType<typeof pcStatus>
