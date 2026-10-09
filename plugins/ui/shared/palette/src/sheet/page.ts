import type { PalettePage } from '../contract'
import { derive, div, dynamicChild, groupLabel, keys, list, show, untrack } from '@sand/dom'
import { cardView, reviewView } from './card'
import { crumbs } from './crumbs'
import { pageHead } from './head'
import { pageModel, type PageModel } from './model'
import type { PageNav } from './nav'
import { rowView } from './row'

const typedIn = (event: KeyboardEvent) => (event.target instanceof HTMLInputElement ? event.target.value : '')

const keyHandler = ({ box, nav, nested, enter }: PageModel) => {
  const listMap = { ...box.keyMap, Enter: enter, Escape: nav.dismiss }
  const listKeys = keys(listMap, { stop: true })
  const backKeys = keys({ ...listMap, Backspace: () => nav.back() }, { stop: true })
  return (event: KeyboardEvent) => {
    if (event.isComposing) return
    const handle = nested && !typedIn(event) ? backKeys : listKeys
    handle(event)
  }
}

const failureLine = (model: PageModel, onReview: boolean, spacing: string) =>
  show(
    derive(() => Boolean(model.failure.get()) && Boolean(model.page.review) === onReview),
    () => div({ class: ['px-5 text-xs text-danger-400', spacing] }, () => model.failure.get()),
  )

const results = (model: PageModel) =>
  list(
    model.rows,
    entry => entry.key,
    entry => {
      const first = untrack(() => entry.get())
      if ('group' in first) return groupLabel(first.group)
      const position = entry.map(current => ('position' in current ? current.position : -1))
      return rowView(first.item, position, model.box, model.act)
    },
    div({ class: 'max-h-96 overflow-auto overscroll-contain px-2 pb-2' }),
  )

export const pageView = (page: PalettePage, nav: PageNav, initial = '') => {
  const model = pageModel(page, nav, initial)
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
    results(model),
    show(
      model.empty.map(Boolean),
      () => div({ class: 'px-6 pt-4 pb-8 text-center text-sm text-neutral-500' }, () => model.empty.get()),
    ),
  )
}
