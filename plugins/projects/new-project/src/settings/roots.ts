import type { Pulse } from '@sand/kit/web'
import type { Machine } from '@sand/web-client/contract'
import { dynamicChild, keys, sig, span } from '@vaakx-dev/vrui'
import { reportError, type ProjectsContext } from '../context'
import { machineMark } from './location'
import { expand, shorten } from './places'

const rootField = (ctx: ProjectsContext, machine: Machine) => {
  const { textInput } = ctx.kit
  const device = machine.id
  let saved = shorten(ctx, ctx.projects.place(device).root, device)
  const text = sig(saved)
  const commit = () => {
    const value = text.get().trim()
    if (!value || value === saved) return text.set(saved)
    const previous = saved
    saved = value
    ctx.projects.setRoot(expand(ctx, value, device), device).catch(error => {
      saved = previous
      text.set(previous)
      reportError(ctx, error)
    })
  }
  return textInput({
    class: 'w-64 max-w-full',
    bindValue: text,
    disabled: !machine.online,
    'aria-label': `Where new projects go on ${machine.name}`,
    onKeyDown: keys({ Enter: commit }),
    onBlur: commit,
  })
}

const rootRow = (ctx: ProjectsContext, machine: Machine) => {
  const { settingsRow } = ctx.kit
  return settingsRow(
    span({ class: 'flex min-w-0 items-center gap-2' }, ...machineMark(ctx.kit, machine.online ? 'success' : 'neutral', 14), span({ class: 'truncate' }, machine.name)),
    rootField(ctx, machine),
    machine.online ? undefined : 'offline',
  )
}

export const rootsSection = (ctx: ProjectsContext, changes: Pulse) => {
  const { settingsSection } = ctx.kit
  return dynamicChild(changes.version, () => {
    const machines = [...ctx.machines.list()].sort((a, b) => Number(b.local) - Number(a.local))
    return settingsSection({ title: 'Where new projects go' }, ...machines.map(machine => rootRow(ctx, machine)))
  })
}
