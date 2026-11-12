import type { Pulse } from '@sand/reactive'
import { dynamicChild } from '@vaakx-dev/vrui'
import type { ChatContext } from '../context'
import { draftPlaces } from '../contract'

export const draftHead = (ctx: ChatContext, changes: Pulse) => {
  const draft = changes.read(() => ctx.threads.drafting())
  const shown = changes.read(() => {
    const found = ctx.threads.drafting()
    return found && ctx.projects.shown({ path: found.cwd, device: found.device })
  })
  const name = () => shown.get()?.name ?? ''
  const choose = () => {
    const found = draft.get()
    if (found) ctx.get(draftPlaces)?.choose(found.id)
  }
  return dynamicChild(
    draft.map(Boolean),
    drafting =>
      drafting
        ? ctx.kit.pickerButton(
            { title: 'Change the project', 'aria-haspopup': 'dialog', lead: ctx.kit.projectAvatar(name, () => shown.get()?.icon), onClick: choose },
            name,
          )
        : null,
  )
}
