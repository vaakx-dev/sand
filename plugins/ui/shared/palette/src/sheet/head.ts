import type { Kit } from '@sand/ui-kit/contract'
import { effect, show, span, untrack, type Props } from '@vaakx-dev/vrui'
import type { PageModel } from './model'

const atEnd = (input: HTMLInputElement) => {
  input.focus()
  input.setSelectionRange(input.value.length, input.value.length)
}

const backButton = ({ icon, iconButton }: Kit, model: PageModel) =>
  model.nested ? iconButton({ title: 'Back', 'aria-label': 'Back', surface: 'raised', onClick: () => model.nav.back() }, icon('back', 16)) : null

const pageLabel = ({ barTitle }: Kit, { page }: PageModel) => span({ class: 'flex max-w-40 shrink-0', title: page.title }, barTitle(page.title))

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

const parts = (kit: Kit, model: PageModel) => {
  const { barTitle, searchField, textInput } = kit
  const { page } = model
  const back = backButton(kit, model)
  if (page.review) return [back, barTitle(page.title)]
  const title = page.id === 'root' ? null : pageLabel(kit, model)
  if (page.field) return [back, title, textInput(fieldProps(model)), submitButton(kit, model)]
  return [back, title, searchField(fieldProps(model))]
}

export const paletteHead = (kit: Kit, model: PageModel) => span({ class: 'flex min-w-0 flex-1 items-center gap-2' }, ...parts(kit, model))
