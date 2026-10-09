import type { Picker } from '@sand/picker/contract'
import type { ProjectGroup } from '@sand/web-client/contract'
import { icon, popoverItem, sig, span } from '@sand/dom'
import type { ProjectsContext } from './types'

const confirmed = async (picker: Picker, group: ProjectGroup) => {
  const picked = await picker.choose(`Delete ${group.name}?`, [
    { label: 'Delete project', detail: 'Removes it from sand on every PC. The folders stay.', tone: 'error', value: true },
    { label: 'Cancel', value: false },
  ])
  return picked?.value === true
}

export const deleteItem = (ctx: ProjectsContext, group: ProjectGroup, close: () => void, fail: (error: unknown) => void) => {
  const picker = ctx.picker
  const armed = sig(false)
  const run = async () => {
    if (picker && !(await confirmed(picker, group))) return
    await ctx.projects.remove(group)
  }
  return popoverItem(
    {
      class: 'text-danger-400',
      onClick: () => {
        if (!picker && !armed.get()) return armed.set(true)
        close()
        run().catch(fail)
      },
    },
    span({ class: 'inline-flex' }, icon('alert', 14)),
    armed.map(on => (on ? 'Click again to delete' : 'Delete project')),
  )
}
