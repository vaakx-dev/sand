import type { Pulse } from '@sand/reactive'
import { div, dynamicChild, show, type Sig } from '@vaakx-dev/vrui'
import type { PanelContext } from '../context'
import { defaultsSection } from './defaults'
import { favouritesPage } from './favourites'
import { createPage, type Page, type View } from './page'
import type { Slots } from './slots'
import { sourcePage } from './source/page'
import { sourcesKey, sourcesSection } from './sources'

const topPage = (page: Page) =>
  div(
    { class: 'flex flex-col gap-6' },
    show(page.changes.read(() => page.ctx.models.list().length > 0), () => defaultsSection(page)),
    dynamicChild(page.changes.read(() => sourcesKey(page)), () => sourcesSection(page)),
  )

const viewKey = (view: View) => (view.kind === 'source' ? `source:${view.id}` : view.kind)

const subpage = (page: Page) => {
  const view = page.view.get()
  if (view.kind === 'source') return sourcePage(page, view.id)
  if (view.kind === 'favourites') return favouritesPage(page)
  return topPage(page)
}

export const modelsPage = (ctx: PanelContext, changes: Pulse, slots: Slots, view: Sig<View>) => {
  const { errorText } = ctx.kit
  const page = createPage(ctx, changes, slots, view)
  return div(
    { class: 'flex flex-col gap-6', onMount: () => () => view.set({ kind: 'top' }) },
    show(page.problem.map(Boolean), () => div({ class: 'px-1' }, errorText(page.problem))),
    dynamicChild(page.view.map(viewKey), () => subpage(page)),
  )
}
