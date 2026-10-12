import type { Picker } from '@sand/picker/contract'
import type { ProjectGroup } from '@sand/web-client/contract'
import { sig } from '@vaakx-dev/vrui'
import { reportError, type ProjectsContext } from '../context'
import { copyEntries, projectEntries, visibilityEntry, type Entry } from './actions'

const confirmed = async (picker: Picker, group: ProjectGroup) => {
  const picked = await picker.choose(`Delete ${group.name}?`, [
    { label: 'Delete project', detail: 'Removes it from sand on every PC. The folders stay.', tone: 'error', value: true },
    { label: 'Cancel', value: false },
  ])
  return picked?.value === true
}

const deleteItem = (ctx: ProjectsContext, group: ProjectGroup, close: () => void) => {
  const { popoverItem } = ctx.kit
  const picker = ctx.picker
  const armed = sig(false)
  const remove = async () => {
    if (picker && !(await confirmed(picker, group))) return
    await ctx.projects.remove(group)
  }
  const onClick = () => {
    if (!picker && !armed.get()) return armed.set(true)
    close()
    remove().catch(error => reportError(ctx, error))
  }
  return popoverItem({ tone: 'danger', icon: 'trash', onClick }, armed.map(on => (on ? 'Delete project?' : 'Delete project')))
}

export const rowMenu = (ctx: ProjectsContext, group: ProjectGroup, close: () => void, looks: Entry[]) => {
  const { menuSeparator, popover, popoverItem } = ctx.kit
  const item = (entry: Entry) =>
    popoverItem(
      {
        icon: entry.icon,
        disabled: entry.disabled,
        onClick: () => {
          close()
          Promise.resolve(entry.run()).catch(error => reportError(ctx, error))
        },
      },
      entry.label,
    )
  const copies = copyEntries(ctx, group)
  return popover(
    close,
    { class: 'top-full right-0 mt-1' },
    ...projectEntries(ctx, group).map(item),
    ...looks.map(item),
    copies.length ? menuSeparator() : null,
    ...copies.map(item),
    menuSeparator(),
    item(visibilityEntry(ctx, group)),
    deleteItem(ctx, group, close),
  )
}
