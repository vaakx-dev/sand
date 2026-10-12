import type { SourceInfo } from '@sand/llm-accounts/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { div, keys, show, span, type Child } from '@vaakx-dev/vrui'
import type { Scene } from './scene'
import { sourceTitle } from './source'
import { FAVOURITES, goTo, type View } from './view'

interface Entry {
  id: string
  title: string
  glyph: Child
  dim?: boolean
  fresh?: boolean
  key?: boolean
}

const railButton = ({ dot, icon, plainButton }: Kit, entry: Entry, view: View, unselected?: () => boolean) => {
  const selected = () => !view.query.get() && view.at.get() === entry.id
  return plainButton(
    {
      role: 'tab',
      'data-focus': `tab:${entry.id}`,
      title: entry.title,
      'aria-label': entry.title,
      'aria-selected': () => String(selected()),
      tabIndex: () => (selected() || unselected?.() ? 0 : -1),
      class: [
        'relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
        () => (selected() ? 'bg-neutral-700 text-neutral-100' : 'text-neutral-400 hover:bg-neutral-700 hover:text-neutral-100'),
      ],
      onClick: () => goTo(view, entry.id),
    },
    span({ class: ['inline-flex', entry.dim && 'opacity-50'] }, entry.glyph),
    show(selected, () => span({ class: 'absolute top-2 bottom-2 left-0 w-1 rounded-full bg-accent-400' })),
    entry.key && span({ class: 'absolute right-1 bottom-1 inline-flex rounded-sm bg-neutral-800 text-neutral-200' }, icon('key', 10)),
    entry.fresh && span({ class: 'absolute top-1 right-1 flex' }, dot('accent')),
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
    key: source.billing === 'api',
  }
}

const divider = () => div({ 'aria-hidden': 'true', class: 'my-1 h-px w-6 shrink-0 bg-neutral-700' })

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
  const favourites: Entry = { id: FAVOURITES, title: 'Favourites', glyph: span({ class: 'inline-flex text-warning-400' }, icon('star', 16)) }
  const unselected = () => Boolean(view.query.get()) || !scene.sources.some(source => source.id === view.at.get())
  return div(
    {
      role: 'tablist',
      'aria-label': 'Model sources',
      'aria-orientation': 'vertical',
      class: 'flex shrink-0 flex-col items-center gap-1 overflow-auto border-r border-solid border-neutral-700 px-2 pb-2',
      onKeyDown: arrows,
    },
    railButton(kit, favourites, view, unselected),
    local.length > 0 && divider(),
    local.map(source => railButton(kit, sourceEntry(scene, source), view)),
    remote.length > 0 && divider(),
    remote.map(source => railButton(kit, sourceEntry(scene, source), view)),
  )
}
