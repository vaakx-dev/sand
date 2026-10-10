import type { SourceInfo } from '@sand/llm-accounts/contract'
import { button, derive, div, dynamicChild, effect, focusable, groupLabel, hint, span } from '@sand/dom'
import { modelRow } from './rows'
import type { Scene } from './scene'
import { findModels } from './search'
import { sourceDetail } from './source'
import { FAVOURITES, type View } from './view'

const heading = (label: string, detail?: string) => groupLabel(span({ class: 'text-neutral-200' }, label), detail ? ` · ${detail}` : '')

const settingsLink = (scene: Scene, text: string) =>
  scene.openSettings ? button({ type: 'button', class: ['text-neutral-300 hover:text-neutral-100', focusable], onClick: scene.openSettings }, text) : null

const sourceList = (scene: Scene, source: SourceInfo) => {
  const models = scene.models.filter(model => model.source === source.id)
  return [
    heading(source.label, sourceDetail(source)),
    models.map(model => modelRow(model, scene)),
    scene.offline(source) && hint(`${source.via} is offline. Its models come back when it does.`),
    source.error && hint(`Could not list the models: ${source.error}`),
    !models.length && !source.error && hint(source.total ? 'All models are hidden' : 'No models yet'),
  ]
}

const favouriteList = (scene: Scene) => {
  const favourites = scene.models.filter(model => model.favourite !== undefined).sort((a, b) => (a.favourite ?? 0) - (b.favourite ?? 0))
  return [
    heading('Favourites'),
    favourites.map(model => modelRow(model, scene, true)),
    !favourites.length && hint('No favourites yet', scene.openSettings ? ' · ' : '', settingsLink(scene, 'Star models in Settings')),
  ]
}

const searchList = (scene: Scene, query: string) => {
  const found = findModels(scene, query)
  return found.length ? found.map(model => modelRow(model, scene, true)) : hint('No models match')
}

const content = (scene: Scene, at: string, query: string) => {
  if (query.trim()) return searchList(scene, query)
  const source = at === FAVOURITES ? undefined : scene.sources.find(known => known.id === at)
  return source ? sourceList(scene, source) : favouriteList(scene)
}

export const modelList = (scene: Scene, view: View) => {
  const place = derive(() => ({ at: view.at.get(), query: view.query.get() }))
  const keepScroll = (node: HTMLElement) =>
    effect(() => {
      const { at, query } = place.get()
      if (`${at}\n${query}` !== view.place) {
        view.place = `${at}\n${query}`
        view.scroll = 0
      }
      node.scrollTop = view.scroll
    })
  return div(
    {
      class: 'min-w-0 flex-1 overflow-auto px-1 pb-1',
      onScroll: event => {
        view.scroll = (event.currentTarget as HTMLElement).scrollTop
      },
      onMount: keepScroll,
    },
    dynamicChild(place, ({ at, query }) => div({ class: 'flex flex-col gap-1' }, content(scene, at, query))),
  )
}
