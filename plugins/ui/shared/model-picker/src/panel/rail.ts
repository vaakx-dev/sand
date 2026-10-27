import type { SourceInfo } from '@sand/accounts/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { div, keys, span, type Child } from '@vaakx-dev/vrui'
import type { Scene } from './scene'
import { sourceTitle } from './source'
import { FAVOURITES, goTo, type View } from './view'

interface Entry {
  id: string
  title: string
  glyph: Child
  dim?: boolean
  fresh?: boolean
}

const railButton = ({ iconButton, withDot }: Kit, entry: Entry, view: View, unselected?: () => boolean) => {
  const selected = () => !view.query.get() && view.at.get() === entry.id
  return iconButton(
    {
      role: 'tab',
      surface: 'raised',
      'data-focus': `tab:${entry.id}`,
      title: entry.title,
      'aria-label': entry.title,
      'aria-selected': () => String(selected()),
      tabIndex: () => (selected() || unselected?.() ? 0 : -1),
      onClick: () => goTo(view, entry.id),
    },
    withDot(span({ class: ['inline-flex', entry.dim && 'opacity-50 grayscale'] }, entry.glyph), () => Boolean(entry.fresh)),
  )
}

const sourceEntry = (scene: Scene, source: SourceInfo): Entry => {
  const { modelLogo } = scene.kit
  const offline = scene.offline(source)
  return {
    id: source.id,
    title: sourceTitle(source, offline),
    glyph: modelLogo(source.provider, 16),
    dim: offline,
    fresh: source.fresh > 0,
  }
}

const gap = () => div({ 'aria-hidden': 'true', class: 'h-2 shrink-0' })

const step = ({ currentTarget, target }: KeyboardEvent, to: (index: number, count: number) => number) => {
  if (!(currentTarget instanceof HTMLElement)) return
  const tabs = [...currentTarget.querySelectorAll<HTMLElement>('[role="tab"]')]
  const next = tabs[to(tabs.findIndex(tab => tab === target), tabs.length)]
  next?.focus()
  next?.click()
}

const arrows = keys({
  ArrowDown: event => step(event, (index, count) => (index + 1) % count),
  ArrowUp: event => step(event, (index, count) => (index - 1 + count) % count),
  Home: event => step(event, () => 0),
  End: event => step(event, (_, count) => count - 1),
})

export const rail = (scene: Scene, view: View) => {
  const { kit } = scene
  const { icon } = kit
  const local = scene.sources.filter(source => !source.via)
  const remote = scene.sources.filter(source => source.via)
  const favourites: Entry = { id: FAVOURITES, title: 'Favourites', glyph: icon('star', 'md') }
  const unselected = () => Boolean(view.query.get()) || !scene.sources.some(source => source.id === view.at.get())
  return div(
    {
      role: 'tablist',
      'aria-label': 'Model sources',
      'aria-orientation': 'vertical',
      class: 'flex shrink-0 flex-col items-center gap-1 overflow-auto pr-2',
      onKeyDown: arrows,
    },
    railButton(kit, favourites, view, unselected),
    local.length > 0 && gap(),
    local.map(source => railButton(kit, sourceEntry(scene, source), view)),
    remote.length > 0 && gap(),
    remote.map(source => railButton(kit, sourceEntry(scene, source), view)),
  )
}
