import { pcHello, type Pcs, type Wire, type WireListen } from '@sand/devices-contract'
import { sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { helloScripts, scriptUpdateWire, type ScriptCall, type ScriptRun, type ScriptUpdate } from '../contract'

interface Known {
  run: ScriptRun
  device: string
}

interface StoreParts {
  wire: Wire
  pcs: Pcs
}

const EVERY_PC: WireListen = { from: 'all' }

const withCall = (calls: ScriptCall[], call: ScriptCall) => {
  const index = calls.findIndex(known => known.call.id === call.call.id)
  return index < 0 ? [...calls, call] : calls.with(index, call)
}

const createStore = (ctx: Context, { wire, pcs }: StoreParts) => {
  const known = sig(new Map<string, Known>())

  const keep = ({ head, call }: ScriptUpdate, device: string) =>
    known.update(all => {
      const calls = all.get(head.id)?.run.calls ?? []
      return new Map(all).set(head.id, { device, run: { ...head, calls: call ? withCall(calls, call) : calls } })
    })

  const hello = (device: string) =>
    known.update(all => {
      const others = [...all].filter(([, found]) => found.device !== device)
      const listed = (wire.hello(helloScripts, device) ?? []).map(run => [run.id, { run, device }] as const)
      return new Map([...others, ...listed])
    })

  ctx.on(pcHello, hello)
  for (const pc of pcs.list()) if (wire.ready(pc.id)) hello(pc.id)
  ctx.effect(() => wire.on(scriptUpdateWire, keep, EVERY_PC))

  return {
    run: (id: string) => known.get().get(id)?.run,
  }
}

type Store = ReturnType<typeof createStore>

export { createStore, type Store }
