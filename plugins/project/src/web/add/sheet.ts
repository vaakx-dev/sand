import type { PcView } from '@sand/devices-contract'
import { sshMachines, type SshHost } from '@sand/devices-ssh/contract'
import type { Pulse } from '@sand/reactive'
import type { SheetSpec } from '@sand/ui-shell/contract'
import { errorMessage } from '@sand/util'
import { derive, div, dynamicChild, show, sig, type Derive } from '@vaakx-dev/vrui'
import type { ProjectAddOptions } from '../../contract'
import type { ProjectsContext } from '../context'
import { openAt } from '../settings/actions'
import { bringStep } from './bring/step'
import { connectStep } from './connect'
import { folderStep } from './folder/step'
import { pcsStep } from './pcs'
import type { Action, Step } from './run'

type Place = { kind: 'pcs' } | { kind: 'connect'; host: SshHost } | { kind: 'folder'; device: string } | { kind: 'bring'; device: string; project: string }

const holds = (ctx: ProjectsContext, project: string, device: string) => Boolean(ctx.projects.get(project)?.locations.some(entry => entry.device === device))

const startAt = (pcs: PcView[], hosts: SshHost[], project: string | undefined): Place => {
  const [only, ...rest] = pcs
  if (!only || rest.length || hosts.length) return { kind: 'pcs' }
  return project ? { kind: 'bring', device: only.id, project } : { kind: 'folder', device: only.id }
}

const addModel = (ctx: ProjectsContext, changes: Pulse, options: ProjectAddOptions) => {
  const { project } = options
  const pcs = changes.read(() => ctx.pcs.list().filter(pc => !project || !holds(ctx, project, pc.id)))
  const hosts = changes.read(() => ctx.get(sshMachines)?.hosts() ?? [])
  const trail = sig<Place[]>([startAt(pcs.get(), hosts.get(), project)])
  const place = derive(() => trail.get().at(-1) ?? { kind: 'pcs' as const })
  const action = sig<Derive<Action> | undefined>(undefined)
  const busy = sig(false)
  const failure = sig('')
  const go = (next: Place) => {
    failure.set('')
    trail.update(list => [...list, next])
  }
  const replace = (next: Place) => trail.update(list => [...list.slice(0, -1), next])
  const fail = (message: string) => {
    back()
    failure.set(message)
  }
  const back = () => {
    failure.set('')
    trail.update(list => list.slice(0, -1))
  }
  const finish = async (close: () => void) => {
    const current = action.get()?.get()
    if (!current?.run || busy.get()) return
    busy.set(true)
    failure.set('')
    const added = await current.run().catch((error: unknown) => {
      failure.set(errorMessage(error))
      return undefined
    })
    busy.set(false)
    if (!added) return
    close()
    await (current.opens || !options.added ? openAt(ctx, added) : options.added(added))
  }
  return { pcs, hosts, project, trail, place, action, busy, failure, go, replace, fail, back, finish }
}

type AddModel = ReturnType<typeof addModel>

const pcName = (ctx: ProjectsContext, device: string) => ctx.pcs.name(device)

const projectName = (ctx: ProjectsContext, project: string) => ctx.projects.get(project)?.name ?? 'project'

const titleOf = (ctx: ProjectsContext, model: AddModel, place: Place) => {
  const several = model.trail.get()[0]?.kind === 'pcs'
  if (place.kind === 'connect') return `Connect ${place.host.name}`
  if (place.kind === 'pcs') return model.project ? `Add ${projectName(ctx, model.project)} to another PC` : 'Add project'
  if (place.kind === 'bring') return `Add ${projectName(ctx, place.project)} to ${pcName(ctx, place.device)}`
  return several ? `Add project on ${pcName(ctx, place.device)}` : 'Add project'
}

const stepOf = (ctx: ProjectsContext, changes: Pulse, model: AddModel, place: Place): Step => {
  const after = (device: string): Place => (model.project ? { kind: 'bring', device, project: model.project } : { kind: 'folder', device })
  if (place.kind === 'pcs') {
    return pcsStep(ctx, model.pcs, model.hosts, device => model.go(after(device)), host => model.go({ kind: 'connect', host }))
  }
  if (place.kind === 'connect') {
    const machines = ctx.get(sshMachines)
    if (!machines) return { body: ctx.kit.errorText('SSH is off.') }
    return connectStep(ctx, machines, place.host, device => model.replace(after(device)), model.fail)
  }
  const pc = ctx.pcs.get(place.device) ?? ctx.pcs.here()
  if (place.kind === 'bring') {
    const group = ctx.projects.get(place.project)
    return group ? bringStep(ctx, changes, pc, group) : { body: ctx.kit.errorText('This project is gone.') }
  }
  return folderStep(ctx, changes, pc, project => model.go({ kind: 'bring', device: place.device, project }))
}

const body = (ctx: ProjectsContext, changes: Pulse, model: AddModel, close: () => void) => {
  const submit = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && event.target instanceof HTMLInputElement) void model.finish(close)
  }
  return div(
    { class: 'flex flex-col gap-4', onKeyDown: submit },
    show(
      () => Boolean(model.failure.get()),
      () => ctx.kit.errorText(() => model.failure.get()),
    ),
    dynamicChild(model.place, place => {
      const step = stepOf(ctx, changes, model, place)
      model.action.set(step.action)
      return step.body
    }),
  )
}

const foot = (ctx: ProjectsContext, model: AddModel, close: () => void) => {
  const { primaryAction, spinner } = ctx.kit
  const button = (action: Derive<Action>) =>
    primaryAction(
      { disabled: () => model.busy.get() || !action.get().run, onClick: () => void model.finish(close) },
      show(model.busy, () => spinner()),
      () => (model.busy.get() ? (action.get().busy ?? action.get().label) : action.get().label),
    )
  return dynamicChild(model.action, action => (action ? button(action) : null))
}

export const addSheet = (ctx: ProjectsContext, changes: Pulse, options: ProjectAddOptions = {}): SheetSpec => {
  const model = addModel(ctx, changes, options)
  return {
    label: 'Add project',
    title: () => titleOf(ctx, model, model.place.get()),
    back: () => (model.trail.get().length > 1 ? model.back : undefined),
    body: close => body(ctx, changes, model, close),
    foot: close => foot(ctx, model, close),
  }
}
