import type { PalettePage } from '../contract'
import type { ContextMenu, Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, keys, list, show, untrack } from '@vaakx-dev/vrui'
import { cardView, reviewView } from './card'
import { crumbs } from './crumbs'
import { paletteHead } from './head'
import { pageModel, type PageModel } from './model'
import type { PageNav } from './nav'
import { rowView } from './row'

const typedIn = (event: KeyboardEvent) => (event.target instanceof HTMLInputElement ? event.target.value : '')

const pressesButton = (event: KeyboardEvent) => event.target instanceof HTMLButtonElement && (event.key === 'Enter' || event.key === ' ')

const caretAtEnd = (event: KeyboardEvent) =>
  !(event.target instanceof HTMLInputElement) || event.target.selectionStart === event.target.value.length

const opensActions = (event: KeyboardEvent, model: PageModel) =>
  event.key === 'ArrowRight' && !event.shiftKey && caretAtEnd(event) && model.openActions()

const keyHandler = (model: PageModel) => {
  const { box, nav, nested, enter } = model
  const listMap = { ...box.keyMap, Enter: enter, Escape: nav.dismiss }
  const listKeys = keys(listMap, { stop: true })
  const backKeys = keys({ ...listMap, Backspace: () => nav.back() }, { stop: true })
  return (event: KeyboardEvent) => {
    if (event.isComposing || pressesButton(event)) return
    if (opensActions(event, model)) {
      event.preventDefault()
      event.stopPropagation()
      return
    }
    const handle = nested && !typedIn(event) ? backKeys : listKeys
    handle(event)
  }
}

const failureLine = ({ errorText }: Kit, model: PageModel, onReview: boolean, spacing: string) =>
  show(
    derive(() => Boolean(model.failure.get()) && Boolean(model.page.review) === onReview),
    () => div({ class: ['px-4', spacing] }, errorText(() => model.failure.get())),
  )

const results = (kit: Kit, model: PageModel, menu: ContextMenu) => {
  const { groupLabel } = kit
  return list(
    model.rows,
    entry => entry.key,
    entry => {
      const first = untrack(() => entry.get())
      if ('group' in first) return groupLabel(first.group)
      const position = entry.map(current => ('position' in current ? current.position : -1))
      return rowView(kit, first.item, position, model, menu)
    },
    div({ class: 'max-h-96 overflow-auto overscroll-contain px-2 pb-2' }),
  )
}

export const pageView = (kit: Kit, page: PalettePage, nav: PageNav, initial = '') => {
  const { contextMenu, hint } = kit
  const model = pageModel(kit, page, nav, initial)
  const menu = contextMenu()
  return div(
    {
      tabIndex: -1,
      class: 'flex min-h-0 flex-col outline-none',
      onKeyDown: keyHandler(model),
      onMount: node => {
        if (page.review) node.focus()
      },
    },
    crumbs(kit, nav),
    paletteHead(kit, model),
    failureLine(kit, model, false, 'pb-2'),
    dynamicChild(model.card, found => (found ? cardView(kit, found) : null)),
    page.review ? reviewView(kit, page.review, model.busy, model.progress, () => void model.confirm()) : null,
    failureLine(kit, model, true, 'pb-3'),
    results(kit, model, menu),
    menu.view(),
    show(
      model.empty.map(Boolean),
      () => hint(() => model.empty.get()),
    ),
  )
}
