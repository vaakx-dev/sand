import { div, dynamicChild, p, type Pulse } from '@sand/dom'
import type { PanelContext } from '../actions'
import { defaultsSection } from './defaults'
import { favouritesPage } from './favourites'
import { createKit, type Kit, type View } from './kit'
import { sourcePage } from './source/page'
import { sourcesKey, sourcesSection } from './sources'

const topPage = (kit: Kit) =>
  div(
    { class: 'flex flex-col gap-6' },
    dynamicChild(kit.changes.read(() => kit.ctx.models.list().length > 0), listed => (listed ? defaultsSection(kit) : div({ class: 'hidden' }))),
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
    p({ class: 'px-1 text-xs wrap-anywhere text-danger-400', hidden: () => !kit.problem.get() }, () => kit.problem.get()),
    dynamicChild(kit.view.map(viewKey), () => subpage(kit)),
  )
}
