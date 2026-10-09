import type { Machine } from '@sand/web-client/contract'
import { div, dot, dynamicChild, errorMessage, icon, keys, settingsRow, settingsSection, span, textInput, type Pulse } from '@sand/dom'
import { expand, machineKey, shorten } from './places'
import type { ProjectsContext } from './types'

const rootField = (ctx: ProjectsContext, machine: Machine) => {
  const device = machineKey(machine)
  let saved = shorten(ctx, ctx.projects.place(device).root, device)
  const commit = () => {
    const value = field.value.trim()
    if (!value || value === saved) {
      field.value = saved
      return
    }
    const previous = saved
    saved = value
    ctx.projects.setRoot(expand(ctx, value, device), device).catch(error => {
      saved = previous
      field.value = previous
      ctx.notify?.push(errorMessage(error), { level: 'error' })
    })
  }
  const field: HTMLInputElement = textInput({
    class: 'w-64 max-w-full',
    value: saved,
    disabled: !machine.online,
    'aria-label': `Where new projects go on ${machine.name}`,
    onKeyDown: keys({ Enter: commit }),
    onBlur: commit,
  })
  return field
}

const rootRow = (ctx: ProjectsContext, machine: Machine) =>
  settingsRow(
    span({ class: 'flex min-w-0 items-center gap-2' }, dot(machine.online ? 'success' : 'neutral'), span({ class: 'inline-flex text-neutral-500' }, icon('monitor', 14)), span({ class: 'truncate' }, machine.name)),
    rootField(ctx, machine),
    machine.online ? undefined : 'offline',
  )

export const rootsSection = (ctx: ProjectsContext, changes: Pulse) =>
  dynamicChild(changes.version, () => {
    const machines = [...ctx.machines.list()].sort((a, b) => Number(b.local) - Number(a.local))
    return div({ class: 'contents' }, settingsSection({ title: 'Where new projects go' }, ...machines.map(machine => rootRow(ctx, machine))))
  })
