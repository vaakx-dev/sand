import type { SourceInfo } from '@sand/llm-accounts/contract'
import { favouritesOf } from '@sand/kit'
import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, effect, span } from '@vaakx-dev/vrui'
import { modelRow } from './rows'
import type { Scene } from './scene'
import { findModels } from './search'
import { sourceDetail } from './source'
import { FAVOURITES, type View } from './view'

const heading = ({ groupLabel }: Kit, label: string, detail?: string) => groupLabel(span({ class: 'text-neutral-200' }, label), detail ? ` · ${detail}` : '')

const settingsHint = ({ kit, openSettings }: Scene, text: string, link: string) => {
  const { hint, linkButton } = kit
  return hint(text, openSettings && [' · ', linkButton({ onClick: openSettings }, link)])
}

const sourceList = (scene: Scene, source: SourceInfo) => {
  const { errorText, hint } = scene.kit
  const models = scene.models.filter(model => model.source === source.id)
  return [
    heading(scene.kit, source.label, sourceDetail(source)),
    models.map(model => modelRow(model, scene)),
    scene.offline(source) && hint(`${source.via} is offline. Its models come back when it does.`),
    source.error && div({ class: 'px-4 py-3' }, errorText(`Could not list the models: ${source.error}`)),
    !models.length && !source.error && hint(source.total ? 'All models are hidden' : 'No models yet'),
  ]
}

const favouriteList = (scene: Scene) => {
  const favourites = favouritesOf(scene.models)
  return [
    heading(scene.kit, 'Favourites'),
    favourites.map(model => modelRow(model, scene, true)),
    !favourites.length && settingsHint(scene, 'No favourites yet', 'Star models in Settings'),
  ]
}

const searchList = (scene: Scene, query: string) => {
  const { hint } = scene.kit
  const found = findModels(scene, query)
  return found.length ? found.map(model => modelRow(model, scene, true)) : hint('No matches')
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
      onScroll: ({ target }) => {
        if (target instanceof HTMLElement) view.scroll = target.scrollTop
      },
      onMount: keepScroll,
    },
    dynamicChild(place, ({ at, query }) => div({ class: 'flex flex-col gap-1' }, content(scene, at, query))),
  )
}
