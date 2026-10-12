import { div, dynamicChild, errorText, show, type Pulse } from '@sand/dom'
import type { PanelContext } from '../actions'
import { defaultsSection } from './defaults'
import { favouritesPage } from './favourites'
import { createKit, type Kit, type View } from './kit'
import { sourcePage } from './source/page'
import { sourcesKey, sourcesSection } from './sources'

const topPage = (kit: Kit) =>
  div(
    { class: 'flex flex-col gap-6' },
    show(kit.changes.read(() => kit.ctx.models.list().length > 0), () => defaultsSection(kit)),
    dynamicChild(kit.changes.read(() => sourcesKey(kit)), () => sourcesSection(kit)),
  )

const viewKey = (view: View) => (view.kind === 'source' ? `source:${view.id}` : view.kind)

const subpage = (kit: Kit) => {
  const view = kit.view.get()
  if (view.kind === 'source') return sourcePage(kit, view.id)
  if (view.kind === 'favourites') return favouritesPage(kit)
  return topPage(kit)
}

export const modelsPage = (ctx: PanelContext, changes: Pulse) => {
  const kit = createKit(ctx, changes)
  return div(
    { class: 'flex flex-col gap-6' },
    show(kit.problem.map(Boolean), () => div({ class: 'px-1' }, errorText(kit.problem))),
    dynamicChild(kit.view.map(viewKey), () => subpage(kit)),
  )
}
