import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, list, resizeObserver, show, type Sig } from '@vaakx-dev/vrui'
import type { Changes, FileChange } from '../changes/collect'
import { displayState } from './display'
import { fileView } from './files/file'
import { fileTree } from './files/tree'
import type { Viewed } from './files/viewed'
import { toolbar } from './toolbar'

export interface Reveal {
  key: string
}

export type Highlighter = (code: string, language: string) => (Node | string)[]

export interface ChangesState {
  changes: Sig<Changes | undefined>
  empty: Sig<string>
  turn: Sig<number | undefined>
  revealed: Sig<Reveal | undefined>
  viewed: Viewed
  highlight: Sig<Highlighter | undefined>
  isClosed(file: FileChange): boolean
  toggle(file: FileChange): void
  markViewed(file: FileChange): void
  reveal(file: FileChange): void
  quote(text: string): void
  copy(text: string, what: string): void
}

const matches = (filter: string) => (file: FileChange) => file.path.toLowerCase().includes(filter.trim().toLowerCase())

export const changesView = (kit: Kit, state: ChangesState) => {
  const { contextMenu, hint } = kit
  const display = displayState()
  const all = derive(() => state.changes.get()?.files ?? [])
  const files = derive(() => (display.wide() ? all.get().filter(matches(display.filter.get())) : all.get()))
  const emptyText = () => (all.get().length ? 'No files match the filter' : state.empty.get())
  const menu = contextMenu()
  const scroller: HTMLElement = div(
    { class: 'min-h-0 flex-1 overflow-y-auto pb-4' },
    list(files, file => file.key, file => fileView(kit, file, state, display, menu, () => scroller)),
    show(
      () => !files.get().length,
      () => hint(emptyText),
    ),
  )
  return div(
    { class: 'flex h-full flex-col', onMount: node => void resizeObserver(node, ([entry]) => entry && display.width.set(entry.contentRect.width)) },
    menu.view(),
    toolbar(kit, state, display, all),
    div(
      { class: 'flex min-h-0 flex-1' },
      show(display.wide, () => fileTree(kit, files, state, display)),
      scroller,
    ),
  )
}
