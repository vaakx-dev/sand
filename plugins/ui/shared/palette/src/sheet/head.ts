import { delayed, div, effect, icon, iconButton, primaryAction, searchInput, show, span, spinner, untrack } from '@sand/dom'
import type { PageModel } from './model'

const atEnd = (input: HTMLInputElement) => {
  input.focus()
  input.setSelectionRange(input.value.length, input.value.length)
}

const lead = (model: PageModel) =>
  model.nested
    ? iconButton({ size: 'sm', title: 'Back', 'aria-label': 'Back', onClick: () => model.nav.back() }, icon('back', 16))
    : span({ class: 'inline-flex' }, icon('search', 17))

const entry = ({ page, text, fills }: PageModel) => {
  const field = page.field
  if (page.review) return span({ class: 'min-w-0 flex-1 truncate text-base text-neutral-200' }, page.title)
  return searchInput({
    placeholder: field?.placeholder ?? page.placeholder ?? 'Search…',
    bindValue: text,
    class: field && field.kind !== 'text' && 'font-mono text-sm',
    onMount: node =>
      effect(() => {
        fills.get()
        untrack(() => atEnd(node))
      }),
  })
}

const submitButton = ({ busy, action, submit }: PageModel) =>
  primaryAction(
    { disabled: () => busy.get() || !action.get()?.enabled, onClick: () => void submit() },
    show(delayed(busy), () => spinner()),
    () => action.get()?.label ?? '',
  )

export const pageHead = (model: PageModel) => {
  const { page, nested } = model
  const titled = (!nested && page.id !== 'root') || page.field?.kind === 'text'
  return div(
    { class: 'flex h-12 shrink-0 items-center gap-3 pr-3 pl-5 text-neutral-400' },
    lead(model),
    titled ? span({ class: 'truncate rounded-md bg-neutral-700 px-2 text-xs text-neutral-300', style: { maxWidth: '40%' }, title: page.title }, page.title) : null,
    entry(model),
    page.field ? submitButton(model) : null,
  )
}
