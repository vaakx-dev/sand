import type { Picker } from '@sand/picker/contract'
import type { ProjectGroup } from '@sand/web-client/contract'
import { icon, menuSeparator, popover, popoverItem, sig, span } from '@sand/dom'
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
  return popoverItem(
    { class: 'text-danger-400', onClick },
    span({ class: 'inline-flex' }, icon('alert', 14)),
    armed.map(on => (on ? 'Click again to delete' : 'Delete project')),
  )
}

export const rowMenu = (ctx: ProjectsContext, group: ProjectGroup, close: () => void, looks: Entry[]) => {
  const item = (entry: Entry) =>
    popoverItem(
      {
        disabled: entry.disabled,
        onClick: () => {
          close()
          Promise.resolve(entry.run()).catch(error => reportError(ctx, error))
        },
      },
      span({ class: 'inline-flex text-neutral-500' }, icon(entry.icon, 14)),
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
