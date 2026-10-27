import type { SourceInfo } from '@sand/accounts/contract'
import { favouritesOf } from '../models'
import { derive, div, dynamicChild, effect } from '@vaakx-dev/vrui'
import { modelRow } from './rows'
import type { Scene } from './scene'
import { findModels } from './search'
import { sourceTitle } from './source'
import { FAVOURITES, type View } from './view'

const empty = ({ kit, openSettings }: Scene, text: string, link?: string) => {
  const { emptyState, linkButton } = kit
  return emptyState({ surface: 'raised', text, action: link && openSettings ? linkButton({ onClick: openSettings }, link) : undefined })
}

const sourceList = (scene: Scene, source: SourceInfo) => {
  const { errorState, sectionHeading } = scene.kit
  const models = scene.models.filter(model => model.source === source.id)
  return [
    sectionHeading(sourceTitle(source, scene.offline(source))),
    models.map(model => modelRow(model, scene)),
    scene.offline(source) && empty(scene, `${source.via} is offline. Its models come back when it does.`),
    source.error && errorState({ surface: 'raised', text: `Couldn't list the models: ${source.error}`, retry: () => scene.refresh(source) }),
    !models.length && !source.error && empty(scene, source.total ? 'All models are hidden.' : 'No models yet.', source.total ? 'Choose models in Settings' : undefined),
  ]
}

const favouriteList = (scene: Scene) => {
  const favourites = favouritesOf(scene.models)
  return [
    scene.kit.sectionHeading('Favourites'),
    favourites.map(model => modelRow(model, scene, true)),
    !favourites.length && empty(scene, 'No favourites yet.', 'Star models in Settings'),
  ]
}

const searchList = (scene: Scene, query: string) => {
  const found = findModels(scene, query)
  return found.length ? found.map(model => modelRow(model, scene, true)) : empty(scene, 'No matches.')
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
      class: 'min-w-0 flex-1 overflow-auto',
      onScroll: ({ target }) => {
        if (target instanceof HTMLElement) view.scroll = target.scrollTop
      },
      onMount: keepScroll,
    },
    dynamicChild(place, ({ at, query }) => div({ class: 'flex flex-col' }, content(scene, at, query))),
  )
}
