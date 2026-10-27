import type { Machine } from '@sand/web-client/contract'
import type { Pulse } from '@sand/web-client/reactive'
import { dynamicChild, keys, sig, type Sig } from '@vaakx-dev/vrui'
import type { ProjectsContext } from '../context'
import { expand, shorten } from './places'

const rootField = (ctx: ProjectsContext, machine: Machine, failed: Sig<string | undefined>) => {
  const { textInput } = ctx.kit
  const device = machine.id
  let saved = shorten(ctx, ctx.projects.place(device).root, device)
  const text = sig(saved)
  const commit = () => {
    const value = text.get().trim()
    if (!value || value === saved) return text.set(saved)
    const previous = saved
    saved = value
    failed.set(undefined)
    ctx.projects.setRoot(expand(ctx, value, device), device).catch(() => {
      saved = previous
      text.set(previous)
      failed.set(`Couldn't use ${value}. Check that the folder exists and try again.`)
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

const rootRow = (ctx: ProjectsContext, machine: Machine, several: boolean) => {
  const { dot, errorText, settingsRow } = ctx.kit
  const failed = sig<string | undefined>(undefined)
  return settingsRow(
    {
      lead: several ? dot(machine.online ? 'success' : 'neutral') : undefined,
      title: machine.name,
      detail: () => {
        const error = failed.get()
        if (error) return errorText(error)
        return machine.online ? '' : 'Offline'
      },
    },
    rootField(ctx, machine, failed),
  )
}

export const rootsSection = (ctx: ProjectsContext, changes: Pulse) => {
  const { settingsSection } = ctx.kit
  return dynamicChild(changes.version, () => {
    const machines = [...ctx.machines.list()].sort((a, b) => Number(b.local) - Number(a.local))
    return settingsSection({ title: 'Where new projects go' }, ...machines.map(machine => rootRow(ctx, machine, machines.length > 1)))
  })
}
