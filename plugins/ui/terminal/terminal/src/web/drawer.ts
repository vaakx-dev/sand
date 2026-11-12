import type { Kit } from '@sand/ui-kit/contract'
import type { Route, Shell, Subject } from '@sand/ui-shell/contract'
import { type Child, derive, div, dynamicChild, show, span } from '@vaakx-dev/vrui'
import { clipboardText } from './integrations/page'
import type { Modifier } from './keys'
import type { Shelf } from './shelf'
import type { Tab } from './tab'

export interface Parts {
  kit: Kit
  shell: Shell
  shelfOf(subject: Subject & { cwd: string }): Shelf
}

const keepFocus = (event: MouseEvent) => event.preventDefault()

const symbols = ['~', '|', '/', '-']

const keyRow = ({ kit }: Parts, tab: Tab) => {
  const key = (label: string, content: Child, press: () => void, active?: () => boolean) =>
    kit.quietButton(
      {
        size: 'lg',
        'aria-label': label,
        active: active ?? false,
        onMouseDown: keepFocus,
        onClick: () => {
          press()
          tab.focus()
        },
      },
      content,
    )
  const hold = (modifier: Modifier, label: string) =>
    key(
      label,
      label,
      () => tab.modifier.set(tab.modifier.get() === modifier ? undefined : modifier),
      () => tab.modifier.get() === modifier,
    )
  const readClipboard = clipboardText()
  return div(
    { class: 'flex shrink-0 items-center gap-1 overflow-x-auto px-2 py-1 scrollbar-none' },
    key('Escape', 'Esc', () => tab.send('\x1b')),
    key('Tab', 'Tab', () => tab.send('\t')),
    hold('ctrl', 'Ctrl'),
    hold('alt', 'Alt'),
    key('Left', kit.icon('left'), () => tab.arrow('D')),
    key('Up', kit.icon('up'), () => tab.arrow('A')),
    key('Down', kit.icon('down'), () => tab.arrow('B')),
    key('Right', kit.icon('right'), () => tab.arrow('C')),
    symbols.map(symbol => key(symbol, symbol, () => tab.send(symbol))),
    readClipboard ? key('Paste', kit.icon('copy'), () => void readClipboard().then(tab.paste, () => {})) : null,
  )
}

const tabButtons = ({ kit }: Parts, shelf: Shelf) =>
  dynamicChild(
    derive(() => shelf.tabs()),
    tabs =>
      tabs.length > 1
        ? div(
            { class: 'flex min-w-0 items-center gap-1 overflow-x-auto scrollbar-none' },
            tabs.map((tab, index) =>
              kit.quietButton({ size: 'sm', 'aria-label': `Terminal ${index + 1}`, active: () => shelf.selected.get() === tab, onClick: () => shelf.pick(tab) }, String(index + 1)),
            ),
          )
        : null,
  )

const closeTab = async (kit: Kit, shelf: Shelf, event: MouseEvent) => {
  const tab = shelf.selected.get()
  if (!tab) return
  const ask = kit.confirm(event)
  if (!(await tab.busy())) return tab.end()
  ask({ id: 'close', label: 'Close', icon: 'trash', danger: true, confirm: 'A command is still running here. Close the terminal and stop it?', run: tab.end })
}

const head = (parts: Parts, shelf: Shelf) => {
  const { kit } = parts
  return div(
    { class: 'flex min-w-0 flex-1 items-center gap-1' },
    tabButtons(parts, shelf),
    kit.iconButton({ size: 'sm', title: 'New terminal', 'aria-label': 'New terminal', onClick: shelf.add }, kit.icon('plus', 'sm')),
    span({ class: 'min-w-0 flex-1 truncate text-xs text-neutral-500' }, () => shelf.failure.get()),
    kit.iconButton(
      { size: 'sm', title: 'Close this terminal', 'aria-label': 'Close this terminal', onClick: event => void closeTab(kit, shelf, event) },
      kit.icon('trash', 'sm'),
    ),
  )
}

const screen = (tab: Tab) =>
  div({ class: 'relative min-h-0 flex-1' }, div({ class: 'absolute inset-0 py-1 pl-3 pr-1 font-mono', onMount: node => tab.mount(node), onClick: tab.focus }))

const shelfView = (parts: Parts, shelf: Shelf) =>
  div(
    { class: 'flex min-h-0 flex-1 flex-col' },
    dynamicChild(shelf.selected, tab => (tab ? screen(tab) : null)),
    show(
      () => parts.shell.state() === 'phone',
      () => dynamicChild(shelf.selected, tab => (tab ? keyRow(parts, tab) : null)),
    ),
  )

const keyOf = (subject: Subject | undefined) => (subject?.cwd ? [subject.session, subject.device, subject.cwd].join('\u0000') : '')

const forShelf = (parts: Parts, route: () => Route, view: (parts: Parts, shelf: Shelf) => HTMLElement) => {
  const subject = () => parts.shell.subjectOf(route())
  return dynamicChild(
    derive(() => keyOf(subject())),
    key => {
      const found = key ? subject() : undefined
      if (!found?.cwd) return null
      const shelf = parts.shelfOf({ ...found, cwd: found.cwd })
      shelf.show()
      return view(parts, shelf)
    },
  )
}

export const drawerHead = (parts: Parts, route: () => Route) => forShelf(parts, route, head)

export const drawer = (parts: Parts, route: () => Route) => div({ class: 'flex min-h-0 flex-1 flex-col' }, forShelf(parts, route, shelfView))
