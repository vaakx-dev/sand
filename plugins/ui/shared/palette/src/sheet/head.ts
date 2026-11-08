import type { Kit } from '@sand/ui-kit/contract'
import { div, effect, show, span, untrack, type Props } from '@vaakx-dev/vrui'
import type { PageModel } from './model'
import { wide } from './wide'

const atEnd = (input: HTMLInputElement) => {
  input.focus()
  input.setSelectionRange(input.value.length, input.value.length)
}

const backButton = ({ icon, iconButton }: Kit, model: PageModel) =>
  model.nested ? iconButton({ title: 'Back', 'aria-label': 'Back', surface: 'raised', onClick: () => model.nav.back() }, icon('back', 16)) : null

const pageLabel = ({ barTitle }: Kit, { page }: PageModel) => span({ class: 'flex max-w-40 shrink-0', title: page.title }, barTitle(page.title))

const fieldProps = ({ page, text, fills, searching }: PageModel): Props<HTMLInputElement> => ({
  placeholder: page.field?.placeholder ?? page.placeholder ?? 'Search',
  'aria-label': page.title,
  bindValue: text,
  class: page.field && page.field.kind !== 'text' && 'font-mono',
  onMount: node =>
    effect(() => {
      fills.get()
      if (searching.get() || wide.get()) untrack(() => atEnd(node))
    }),
})

const submitButton = ({ delayed, primaryAction, spinner }: Kit, { busy, action, submit }: PageModel) =>
  primaryAction(
    { disabled: () => busy.get() || !action.get()?.enabled, onClick: () => void submit() },
    show(delayed(busy), () => spinner()),
    () => action.get()?.label ?? '',
  )

const formParts = (kit: Kit, model: PageModel) => {
  const back = backButton(kit, model)
  if (model.page.review) return [back, kit.barTitle(model.page.title)]
  return [back, pageLabel(kit, model), kit.textInput(fieldProps(model)), submitButton(kit, model)]
}

export const formHead = (kit: Kit, model: PageModel) => span({ class: 'flex min-w-0 flex-1 items-center gap-2' }, ...formParts(kit, model))

const cancelButton = ({ quietButton }: Kit, onClick: () => void) => quietButton({ class: 'shrink-0 sm:hidden', onClick }, 'Cancel')

const stopSearching = ({ text, searching }: PageModel) => {
  text.set('')
  searching.set(false)
}

const searchButton = ({ icon, iconButton }: Kit, model: PageModel) => {
  const label = model.page.placeholder ?? 'Search'
  return iconButton({ title: label, 'aria-label': label, surface: 'raised', class: 'sm:hidden', onClick: () => model.searching.set(true) }, icon('search', 'md'))
}

const listHead = (kit: Kit, model: PageModel) => [
  div(
    { class: () => [model.searching.get() ? 'hidden sm:flex' : 'flex', 'min-h-12 items-center gap-2 sm:min-h-0 sm:pt-3'] },
    backButton(kit, model),
    kit.sheetTitle(model.page.title),
    show(
      () => !model.searching.get(),
      () => searchButton(kit, model),
    ),
  ),
  div(
    { class: () => [model.searching.get() ? 'flex' : 'hidden sm:flex', 'items-center gap-2'] },
    kit.searchLine(fieldProps(model)),
    cancelButton(kit, () => stopSearching(model)),
  ),
]

const searchHead = (kit: Kit, model: PageModel) => [
  div(
    { class: 'flex items-center gap-2' },
    backButton(kit, model),
    model.nested ? pageLabel(kit, model) : null,
    kit.searchLine(fieldProps(model)),
    cancelButton(kit, () => model.nav.close()),
  ),
]

export const paletteHead = (kit: Kit, model: PageModel) =>
  div({ class: 'flex shrink-0 flex-col px-4 sm:pt-1' }, ...(model.page.browse ? listHead(kit, model) : searchHead(kit, model)))
