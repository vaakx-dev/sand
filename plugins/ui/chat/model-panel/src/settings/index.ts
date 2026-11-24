import type { SourceInfo } from '@sand/accounts/contract'
import { sourceName } from '@sand/model-picker/contract'
import type { Pulse } from '@sand/reactive'
import type { Settings } from '@sand/settings/contract'
import { collectScope, disposeAll, div, dynamicChild, effect, show, untrack } from '@vaakx-dev/vrui'
import type { Dispose } from 'drydock'
import type { PanelContext } from '../context'
import { favouritesPage } from './favourites'
import { createPage, FAVOURITES, LIST, sourcePageId, type Page } from './page'
import { pickItems, picksSection } from './picks'
import { sourcePage } from './source/page'
import { sourceItems, sourcesKey, sourcesSection } from './sources'

const topPage = (page: Page) =>
  div(
    { class: 'flex flex-col gap-6' },
    show(page.changes.read(() => page.ctx.models.list().length > 0), () => picksSection(page)),
    dynamicChild(page.changes.read(() => sourcesKey(page)), () => sourcesSection(page)),
  )

const withProblem = (page: Page, body: () => HTMLElement) => () =>
  div({ class: 'flex flex-col gap-6' }, show(page.problem.map(Boolean), () => div({ class: 'px-1' }, page.ctx.kit.errorText(page.problem))), body())

const sourcePages = (settings: Settings, page: Page) => {
  const shown = new Map<string, Dispose>()
  const add = (source: SourceInfo) => {
    if (shown.has(source.id)) return
    const render = withProblem(page, () => sourcePage(page, source.id))
    shown.set(source.id, settings.page({ id: sourcePageId(source.id), label: sourceName(source), parent: LIST, group: 'agents', render }))
  }
  const drop = (id: string) => {
    if (settings.current() === sourcePageId(id)) settings.open(LIST)
    void shown.get(id)?.()
    shown.delete(id)
  }
  const sync = (sources: SourceInfo[]) => {
    sources.forEach(add)
    const kept = new Set(sources.map(source => source.id))
    for (const id of [...shown.keys()]) if (!kept.has(id)) drop(id)
  }
  const sources = page.changes.read(() => page.ctx.models.sources())
  const stop = effect(() => {
    const found = sources.get()
    untrack(() => sync(found))
  })
  return () => {
    stop()
    for (const dispose of shown.values()) void dispose()
    shown.clear()
  }
}

export const modelItems = [...pickItems, ...sourceItems]

export const modelsPages = (ctx: PanelContext, changes: Pulse, settings: Settings) => {
  const { value: stops, scope } = collectScope(() => {
    const page = createPage(ctx, changes, settings)
    return [
      settings.page({ id: LIST, label: 'Models', icon: 'sparkles', group: 'agents', order: 20, items: modelItems, render: withProblem(page, () => topPage(page)) }),
      settings.page({ id: FAVOURITES, label: 'Favourites', parent: LIST, group: 'agents', render: withProblem(page, () => favouritesPage(page)) }),
      sourcePages(settings, page),
    ]
  })
  return () => {
    for (const stop of stops) void stop()
    disposeAll(scope)
  }
}
