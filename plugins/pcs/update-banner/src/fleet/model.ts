import type { ReleaseInfo, UpdateChannel, UpdateState } from '@sand/host-updates/contract'
import { errorMessage } from '@sand/kit'
import { pulse } from '@sand/kit/web'
import type { WireEvent, WireRequest } from '@sand/protocol'
import { derive, onTimeout, sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { isSettled, runStatus, type Run, type RunStatus } from './run'
import { canUpdate, pcStatus, pickTarget, type Pc, type PcStatus } from './status'

const local = ''

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

export const createFleet = (ctx: Context<'wire' | 'machines'>) => {
  const machines = pulse(ctx, ['machines.change', 'wire.hello', 'wire.state'])
  const states = sig(new Map<string, UpdateState>())
  const failures = sig(new Map<string, string>())
  const run = sig<Run | undefined>(undefined)
  const busy = sig(false)

  const call = <T>(key: string, request: WireRequest) => ctx.wire.call<T>(request, key || undefined)
  const keyOf = (machine: { local: boolean; id: string }) => (machine.local ? local : machine.id)
  const notify = (error: unknown) => ctx.notify?.push(errorMessage(error), { level: 'error' })

  const store = (key: string, state: unknown) => {
    if (isState(state)) states.set(withEntry(states.get(), key, state))
  }

  const load = (key: string) => call<UpdateState>(key, { type: 'updates.state' }).then(state => store(key, state), () => {})

  const pcs = machines.read<Pc[]>(() => {
    const known = states.get()
    const failed = failures.get()
    return ctx.machines.list().map(machine => {
      const key = keyOf(machine)
      return { key, name: machine.name, local: machine.local, online: machine.online, state: known.get(key), failure: failed.get(key) }
    })
  })

  const channel = derive<UpdateChannel | undefined>(() => {
    const known = states.get()
    return known.get(local)?.channel ?? [...known.values()][0]?.channel
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

  const onEvent = (key: string, event: WireEvent) => {
    if (event.name === 'updates.change') store(key, event.args[0])
  }

  ctx.on('wire.hello', () => {
    seen.add(local)
    void load(local)
  })
  ctx.on('wire.event', event => onEvent(local, event))
  ctx.on('machines.event', onEvent)
  ctx.on('machines.change', refresh)
  onTimeout(refresh)

  const everyOnline = (request: WireRequest) =>
    Promise.all(
      pcs
        .get()
        .filter(pc => pc.online && pc.state)
        .map(pc =>
          call<unknown>(pc.key, request).then(
            state => store(pc.key, state),
            error => notify(`${pc.name}: ${errorMessage(error)}`),
          ),
        ),
    )

  const guarded = async (work: () => Promise<unknown>) => {
    if (busy.get()) return
    busy.set(true)
    try {
      await work()
    } catch (error) {
      notify(error)
    } finally {
      busy.set(false)
    }
  }

  const applyOn = async (key: string, build: string) => {
    failures.set(without(failures.get(), key))
    try {
      const wanted = channel.get()
      if (wanted && states.get().get(key)?.channel !== wanted) store(key, await call<UpdateState>(key, { type: 'updates.channel', channel: wanted }))
      store(key, await call<UpdateState>(key, { type: 'updates.apply', build }))
    } catch (error) {
      failures.set(withEntry(failures.get(), key, errorMessage(error)))
    }
  }

  const update = async (keys: string[]) => {
    const release = target.get()
    if (!release || !keys.length) return
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
    call<UpdateState>(key, { type: 'updates.restart' }).then(
      state => store(key, state),
      error => notify(error),
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
    check: () => guarded(() => everyOnline({ type: 'updates.check' })),
    later: () => guarded(() => everyOnline({ type: 'updates.later' })),
    setChannel: (next: UpdateChannel) => guarded(() => everyOnline({ type: 'updates.channel', channel: next })),
  }
}

export type Fleet = ReturnType<typeof createFleet>
