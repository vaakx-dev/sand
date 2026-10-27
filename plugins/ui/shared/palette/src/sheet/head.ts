import type { Kit } from '@sand/ui-kit/contract'
import { effect, show, span, untrack, type Props } from '@vaakx-dev/vrui'
import type { PageModel } from './model'

const atEnd = (input: HTMLInputElement) => {
  input.focus()
  input.setSelectionRange(input.value.length, input.value.length)
}

const backButton = ({ icon, iconButton }: Kit, model: PageModel) =>
  model.nested ? iconButton({ title: 'Back', 'aria-label': 'Back', surface: 'raised', onClick: () => model.nav.back() }, icon('back', 16)) : null

const pageLabel = ({ page }: PageModel) => span({ class: 'max-w-40 shrink-0 truncate text-sm font-medium text-neutral-100', title: page.title }, page.title)

const fieldProps = ({ page, text, fills }: PageModel): Props<HTMLInputElement> => ({
  placeholder: page.field?.placeholder ?? page.placeholder ?? 'Search…',
  'aria-label': page.title,
  bindValue: text,
  class: page.field && page.field.kind !== 'text' && 'font-mono',
  onMount: node =>
    effect(() => {
      fills.get()
      untrack(() => atEnd(node))
    }),
})

const submitButton = ({ delayed, primaryAction, spinner }: Kit, { busy, action, submit }: PageModel) =>
  primaryAction(
    { disabled: () => busy.get() || !action.get()?.enabled, onClick: () => void submit() },
    show(delayed(busy), () => spinner()),
    () => action.get()?.label ?? '',
  )

export const paletteHead = (kit: Kit, model: PageModel) => {
  const { headTitle, paneHead, searchField, searchRow, textInput } = kit
  const { page, nested } = model
  const back = backButton(kit, model)
  if (page.review) return paneHead({ led: nested }, back, headTitle(2, page.title))
  const title = page.id === 'root' ? null : pageLabel(model)
  if (page.field) return paneHead({ led: nested }, back, title, textInput(fieldProps(model)), submitButton(kit, model))
  return title ? paneHead({ led: nested }, back, title, searchField(fieldProps(model))) : searchRow(fieldProps(model), back ?? undefined)
}
