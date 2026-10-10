import type { SourceInfo } from '@sand/llm-accounts/contract'
import { button, div, dot, focusable, icon, keys, span, type Child } from '@sand/dom'
import type { Scene } from './scene'
import { logo, sourceTitle } from './source'
import { FAVOURITES, goTo, type View } from './view'

interface Entry {
  id: string
  title: string
  glyph: Child
  dim?: boolean
  fresh?: boolean
  key?: boolean
}

const railButton = (entry: Entry, view: View, unselected?: () => boolean) => {
  const selected = () => !view.query.get() && view.at.get() === entry.id
  return button(
    {
      type: 'button',
      role: 'tab',
      'data-focus': `tab:${entry.id}`,
      title: entry.title,
      'aria-label': entry.title,
      'aria-selected': () => String(selected()),
      tabIndex: () => (selected() || unselected?.() ? 0 : -1),
      class: [
        'relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
        focusable,
        () => (selected() ? 'bg-neutral-700 text-neutral-100' : 'text-neutral-400 hover:bg-neutral-700 hover:text-neutral-100'),
      ],
      onClick: () => goTo(view, entry.id),
    },
    span({ class: ['inline-flex', entry.dim && 'opacity-50'] }, entry.glyph),
    span({ class: ['absolute top-2 bottom-2 left-0 w-1 rounded-full bg-accent-400', () => !selected() && 'hidden'] }),
    entry.key && span({ class: 'absolute right-1 bottom-1 inline-flex rounded-sm bg-neutral-800 text-neutral-200' }, icon('key', 10)),
    entry.fresh && span({ class: 'absolute top-1 right-1 flex' }, dot('accent')),
  )
}

const sourceEntry = (scene: Scene, source: SourceInfo): Entry => {
  const offline = scene.offline(source)
  return {
    id: source.id,
    title: sourceTitle(source, offline),
    glyph: logo(source.provider),
    dim: offline,
    fresh: source.fresh > 0,
    key: source.billing === 'api',
  }
}

const divider = () => div({ 'aria-hidden': 'true', class: 'my-1 h-px w-6 shrink-0 bg-neutral-700' })

const step = (event: KeyboardEvent, to: (index: number, count: number) => number) => {
  const tabs = [...(event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('[role="tab"]')]
  const next = tabs[to(tabs.indexOf(event.target as HTMLElement), tabs.length)]
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
  const local = scene.sources.filter(source => !source.via)
  const remote = scene.sources.filter(source => source.via)
  const favourites: Entry = { id: FAVOURITES, title: 'Favourites', glyph: span({ class: 'inline-flex text-warning-400' }, icon('star')) }
  const unselected = () => Boolean(view.query.get()) || !scene.sources.some(source => source.id === view.at.get())
  return div(
    {
      role: 'tablist',
      'aria-label': 'Model sources',
      'aria-orientation': 'vertical',
      class: 'flex shrink-0 flex-col items-center gap-1 overflow-auto border-r border-solid border-neutral-700 px-2 pb-2',
      onKeyDown: arrows,
    },
    railButton(favourites, view, unselected),
    local.length > 0 && divider(),
    local.map(source => railButton(sourceEntry(scene, source), view)),
    remote.length > 0 && divider(),
    remote.map(source => railButton(sourceEntry(scene, source), view)),
  )
}
