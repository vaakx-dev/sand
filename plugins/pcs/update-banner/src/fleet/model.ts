import type { Request } from '@sand/host-hub/contract'
import {
  updatesApply,
  updatesChange,
  updatesChannel,
  updatesCheck,
  updatesLater,
  updatesRestart,
  updatesState,
  type ReleaseInfo,
  type UpdateChannel,
  type UpdateState,
} from '@sand/host-updates/contract'
import { errorMessage } from '@sand/util'
import { machinesChange, wireHello, wireState, type machines, type wire } from '@sand/web-client/contract'
import { pulse } from '@sand/web-client/reactive'
import { derive, onTimeout, sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { isSettled, runStatus, type Run, type RunStatus } from './run'
import { canUpdate, pcStatus, pickTarget, type Pc, type PcStatus } from './status'

export interface PcView extends Pc {
  status: PcStatus
}

export interface RunRow {
  key: string
  pc?: PcView
  status: RunStatus
}

const without = <T>(map: Map<string, T>, key: string) => {
  const next = new Map(map)
  next.delete(key)
  return next
}

const withEntry = <T>(map: Map<string, T>, key: string, value: T) => new Map(map).set(key, value)

const isState = (value: unknown): value is UpdateState => typeof value === 'object' && value !== null && 'phase' in value

export const createFleet = (ctx: Context<{ wire: typeof wire; machines: typeof machines }>) => {
  const changes = pulse(ctx, [machinesChange, wireHello, wireState])
  const states = sig(new Map<string, UpdateState>())
  const failures = sig(new Map<string, string>())
  const run = sig<Run | undefined>(undefined)
  const busy = sig(false)

  const call = <I, O>(key: string, request: Request<I, O>, input: I) => ctx.wire.call(request, input, key)
  const here = () => ctx.machines.here().id

  const store = (key: string, state: unknown) => {
    if (isState(state)) states.set(withEntry(states.get(), key, state))
  }

  const load = (key: string) => call(key, updatesState, {}).then(state => store(key, state), () => {})

  const pcs = changes.read<Pc[]>(() => {
    const known = states.get()
    const failed = failures.get()
    return ctx.machines.list().map(machine => {
      const key = machine.id
      return { key, name: machine.name, local: machine.local, online: machine.online, state: known.get(key), failure: failed.get(key) }
    })
  })

  const channel = derive<UpdateChannel | undefined>(() => {
    const known = states.get()
    return known.get(here())?.channel ?? [...known.values()][0]?.channel
  })

  const target = derive<ReleaseInfo | undefined>(() => {
    const online = new Set(pcs.get().filter(pc => pc.online).map(pc => pc.key))
    return pickTarget([...states.get()].filter(([key]) => online.has(key)).map(([, state]) => state), channel.get())
  })

  const views = derive<PcView[]>(() => pcs.get().map(pc => ({ ...pc, status: pcStatus(pc, target.get(), channel.get()) })))

  const pending = derive(() => views.get().filter(pc => canUpdate(pc.status) && pc.status.kind !== 'failed'))

  const runRows = derive<RunRow[]>(() => {
    const current = run.get()
    if (!current) return []
    const byKey = new Map(views.get().map(pc => [pc.key, pc]))
    return current.keys.map(key => ({ key, pc: byKey.get(key), status: runStatus(byKey.get(key), current.build) }))
  })

  const runFinished = derive(() => Boolean(run.get()) && runRows.get().every(row => isSettled(row.status)))

  const seen = new Set<string>()
  const refresh = () => {
    for (const pc of pcs.get()) {
      if (!pc.online) seen.delete(pc.key)
      else if (!seen.has(pc.key)) {
        seen.add(pc.key)
        void load(pc.key)
      }
    }
  }

  ctx.on(wireHello, () => {
    seen.add(here())
    void load(here())
  })
  ctx.effect(() => ctx.wire.on(updatesChange, (state, key) => store(key, state), { remotes: true }))
  ctx.on(machinesChange, refresh)
  onTimeout(refresh)

  const everyOnline = <I>(request: Request<I, UpdateState>, input: I) =>
    Promise.all(
      pcs
        .get()
        .filter(pc => pc.online && pc.state)
        .map(pc =>
          call(pc.key, request, input).then(
            state => store(pc.key, state),
            () => {},
          ),
        ),
    )

  const guarded = async (work: () => Promise<unknown>) => {
    if (busy.get()) return
    busy.set(true)
    await work().catch(() => {})
    busy.set(false)
  }

  const applyOn = async (key: string, build: string) => {
    failures.set(without(failures.get(), key))
    try {
      const wanted = channel.get()
      if (wanted && states.get().get(key)?.channel !== wanted) store(key, await call(key, updatesChannel, { channel: wanted }))
      store(key, await call(key, updatesApply, { build }))
    } catch (error) {
      failures.set(withEntry(failures.get(), key, errorMessage(error)))
    }
  }

  const update = async (keys: string[]) => {
    const release = target.get()
    if (!release || !keys.length) return
    const local = here()
    const remote = keys.filter(key => key !== local)
    const ordered = keys.includes(local) ? [...remote, local] : remote
    run.set({ build: release.build.id, name: release.name, keys: ordered })
    await Promise.all(remote.map(key => applyOn(key, release.build.id)))
    if (keys.includes(local)) await applyOn(local, release.build.id)
  }

  const retry = (key: string) => {
    const current = run.get()
    const build = current?.build ?? target.get()?.build.id
    if (!build) return
    if (!current) run.set({ build, name: target.get()?.name ?? '', keys: [key] })
    else if (!current.keys.includes(key)) run.set({ ...current, keys: [...current.keys, key] })
    void applyOn(key, build)
  }

  const restartNow = (key: string) =>
    call(key, updatesRestart, {}).then(
      state => store(key, state),
      () => {},
    )

  const finish = () => {
    run.set(undefined)
    failures.set(new Map())
  }

  return {
    pcs: views,
    pending,
    target,
    channel,
    run,
    runRows,
    runFinished,
    busy,
    update,
    retry,
    restartNow,
    finish,
    check: () => guarded(() => everyOnline(updatesCheck, {})),
    later: () => guarded(() => everyOnline(updatesLater, {})),
    setChannel: (next: UpdateChannel) => guarded(() => everyOnline(updatesChannel, { channel: next })),
  }
}

export type Fleet = ReturnType<typeof createFleet>
