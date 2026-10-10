import type { PalettePage } from '../contract'
import { contextMenu, derive, div, dynamicChild, groupLabel, keys, list, show, untrack, type ContextMenu } from '@sand/dom'
import { cardView, reviewView } from './card'
import { crumbs } from './crumbs'
import { pageHead } from './head'
import { itemMenu } from './menu'
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

const failureLine = (model: PageModel, onReview: boolean, spacing: string) =>
  show(
    derive(() => Boolean(model.failure.get()) && Boolean(model.page.review) === onReview),
    () => div({ class: ['px-5 text-xs text-danger-400', spacing] }, () => model.failure.get()),
  )

const results = (model: PageModel, menu: ContextMenu) =>
  list(
    model.rows,
    entry => entry.key,
    entry => {
      const first = untrack(() => entry.get())
      if ('group' in first) return groupLabel(first.group)
      const position = entry.map(current => ('position' in current ? current.position : -1))
      return rowView(first.item, position, model.box, model.more, menu, item => itemMenu(item, model.runAction))
    },
    div({ class: 'max-h-96 overflow-auto overscroll-contain px-2 pb-2' }),
  )

export const pageView = (page: PalettePage, nav: PageNav, initial = '') => {
  const model = pageModel(page, nav, initial)
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
    crumbs(nav),
    pageHead(model),
    failureLine(model, false, 'pb-2'),
    dynamicChild(model.card, found => (found ? cardView(found) : div())),
    page.review ? reviewView(page.review, model.busy, model.progress, () => void model.confirm()) : null,
    failureLine(model, true, 'pb-3'),
    results(model, menu),
    menu.view(),
    show(
      model.empty.map(Boolean),
      () => div({ class: 'px-6 pt-4 pb-8 text-center text-sm text-neutral-500' }, () => model.empty.get()),
    ),
  )
}
