import type { PcView } from '@sand/devices-contract'
import type { Pulse } from '@sand/reactive'
import { settingMark } from '@sand/settings/contract'
import { derive, dynamicChild, keys, sig, type Sig } from '@vaakx-dev/vrui'
import type { ProjectsContext } from '../context'
import { tildeHome } from '@sand/util'
import { absolute } from '../add/paths'

export const rootItem = { id: 'project-root', label: 'Where new projects go', keywords: ['folder', 'location', 'path', 'root', 'default folder'] }

const rootField = (ctx: ProjectsContext, pc: Sig<PcView>, failed: Sig<string | undefined>) => {
  const { textInput } = ctx.kit
  const device = pc.get().id
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
      failed.set(`Couldn't use ${tildeHome(value)}`)
    })
  }
  return textInput({
    class: 'w-64 max-w-full',
    bindValue: text,
    disabled: () => !pc.get().online,
    'aria-label': () => `Where new projects go on ${pc.get().name}`,
    onKeyDown: keys({ Enter: commit }),
    onBlur: commit,
  })
}

const rootRow = (ctx: ProjectsContext, pc: Sig<PcView>, several: () => boolean) => {
  const { dot, errorText, settingsRow } = ctx.kit
  const failed = sig<string | undefined>(undefined)
  const online = pc.map(current => current.online)
  return settingsRow(
    {
      lead: dynamicChild(
        derive(() => several() && (online.get() ? 'success' : 'neutral')),
        tone => (tone ? dot(tone) : null),
      ),
      title: () => pc.get().name,
      detail: () => {
        const error = failed.get()
        if (error) return errorText(error)
        return online.get() ? '' : 'Offline'
      },
    },
    rootField(ctx, pc, failed),
  )
}

export const rootsSection = (ctx: ProjectsContext, changes: Pulse) => {
  const { rowList, settingsSection } = ctx.kit
  const pcs = changes.read(() => ctx.pcs.list())
  const several = () => pcs.get().length > 1
  return settingsSection({ ...settingMark(rootItem.id), title: rootItem.label }, rowList(pcs, pc => pc.id, pc => rootRow(ctx, pc, several)))
}
