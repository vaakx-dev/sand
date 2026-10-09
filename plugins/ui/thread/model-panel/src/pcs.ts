import type { PcList, TurnResult } from '@sand/protocol'
import { effect, onTimeout, sig } from '@sand/dom'
import type { Context } from 'drydock'

const recheck = 60_000

export const pcStatus = (ctx: Context) => {
  const online = sig<Record<string, boolean>>({})
  const down = sig(new Set<string>())
  const apply = (list: PcList) => online.set(Object.fromEntries(list.pcs.filter(pc => pc.checked).map(pc => [pc.name, pc.online && pc.pairing !== 'refused'])))
  const load = () => void ctx.wire?.call<PcList>({ type: 'pcs.list' }).then(apply, () => undefined)
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
  ctx.on('wire.event', event => {
    if (event.name === 'pcs.change') {
      down.set(new Set())
      apply(event.args[0])
    }
    if (event.name === 'turn.end') ended(event.args[1])
  })
  effect(() => {
    if (down.get().size) return onTimeout(recover, recheck)
  })
  ctx.on('wire.hello', load)
  if (ctx.wire?.state() === 'open') load()
  const status = (name: string): boolean | undefined => (down.get().has(name) ? false : online.get()[name])
  return {
    online: status,
    key: () => JSON.stringify([online.get(), [...down.get()]]),
    refresh: load,
  }
}

export type PcStatus = ReturnType<typeof pcStatus>
