import type { Pulse } from '@sand/reactive'
import { folderName } from '@sand/util'
import { type DraftTarget, projects } from '@sand/web-client/contract'
import { dynamicChild, span } from '@vaakx-dev/vrui'
import type { ChatContext } from '../context'
import { draftPlaces } from '../contract'

const QUICK_NAME = 'Quick thread'

const placeOf = (ctx: ChatContext, { cwd, device }: DraftTarget) => {
  if (!cwd) return { name: QUICK_NAME, icon: { quick: true } }
  const found = ctx.get(projects)
  const group = found?.group(cwd, device)
  if (group) return { name: group.name || folderName(cwd), icon: found?.groupIcon(group) }
  return { name: found?.name(cwd, device) ?? folderName(cwd), icon: found?.icon(cwd, device) }
}

export const draftHead = (ctx: ChatContext, changes: Pulse) => {
  const place = changes.read(() => {
    const draft = ctx.threads.drafting()
    return draft && placeOf(ctx, draft)
  })
  const choose = () => {
    const draft = ctx.threads.drafting()
    if (draft) ctx.get(draftPlaces)?.choose(draft.id)
  }
  return dynamicChild(place, found =>
    found
      ? ctx.kit.quietButton(
          { title: 'Change the project', class: 'min-w-0 gap-2 px-2', onClick: choose },
          ctx.kit.projectIcon(found.name, found.icon, 16),
          span({ class: 'min-w-0 truncate text-sm text-neutral-200' }, found.name),
        )
      : null,
  )
}
