import type { PcView } from '@sand/devices-contract'
import type { Pulse } from '@sand/reactive'
import { dynamicChild, keys, sig, type Sig } from '@vaakx-dev/vrui'
import type { ProjectsContext } from '../context'
import { tildeHome } from '@sand/util'
import { absolute } from '../add/paths'

const rootField = (ctx: ProjectsContext, pc: PcView, failed: Sig<string | undefined>) => {
  const { textInput } = ctx.kit
  const device = pc.id
  let saved = tildeHome(ctx.projects.place(device).root)
  const text = sig(saved)
  const commit = () => {
    const value = text.get().trim()
    if (!value || value === saved) return text.set(saved)
    const previous = saved
    saved = value
    failed.set(undefined)
    ctx.projects.setRoot(absolute(value, ctx.projects.place(device)), device).catch(() => {
      saved = previous
      text.set(previous)
      failed.set(`Couldn't use ${tildeHome(value)}. Check that the folder exists and try again.`)
    })
  }
  return textInput({
    class: 'w-64 max-w-full',
    bindValue: text,
    disabled: !pc.online,
    'aria-label': `Where new projects go on ${pc.name}`,
    onKeyDown: keys({ Enter: commit }),
    onBlur: commit,
  })
}

const rootRow = (ctx: ProjectsContext, pc: PcView, several: boolean) => {
  const { dot, errorText, settingsRow } = ctx.kit
  const failed = sig<string | undefined>(undefined)
  return settingsRow(
    {
      lead: several ? dot(pc.online ? 'success' : 'neutral') : undefined,
      title: pc.name,
      detail: () => {
        const error = failed.get()
        if (error) return errorText(error)
        return pc.online ? '' : 'Offline'
      },
    },
    rootField(ctx, pc, failed),
  )
}

export const rootsSection = (ctx: ProjectsContext, changes: Pulse) => {
  const { settingsSection } = ctx.kit
  return dynamicChild(changes.version, () => {
    const pcs = ctx.pcs.list()
    return settingsSection({ title: 'Where new projects go' }, ...pcs.map(pc => rootRow(ctx, pc, pcs.length > 1)))
  })
}
