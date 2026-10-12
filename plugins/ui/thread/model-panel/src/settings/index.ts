import type { Pulse } from '@sand/kit/web'
import { div, dynamicChild, show } from '@vaakx-dev/vrui'
import type { PanelContext } from '../actions'
import { defaultsSection } from './defaults'
import { favouritesPage } from './favourites'
import { createPage, type Page, type View } from './page'
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

export const modelsPage = (ctx: PanelContext, changes: Pulse) => {
  const { errorText } = ctx.kit
  const page = createPage(ctx, changes)
  return div(
    { class: 'flex flex-col gap-6' },
    show(page.problem.map(Boolean), () => div({ class: 'px-1' }, errorText(page.problem))),
    dynamicChild(page.view.map(viewKey), () => subpage(page)),
  )
}
