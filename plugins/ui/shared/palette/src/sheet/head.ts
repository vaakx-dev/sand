import {
  badge,
  delayed,
  effect,
  headTitle,
  icon,
  iconButton,
  paneHead,
  primaryAction,
  searchField,
  searchRow,
  show,
  span,
  spinner,
  SPACE,
  textInput,
  untrack,
  type Props,
} from '@sand/dom'
import type { PageModel } from './model'

const atEnd = (input: HTMLInputElement) => {
  input.focus()
  input.setSelectionRange(input.value.length, input.value.length)
}

const backButton = (model: PageModel) =>
  model.nested ? iconButton({ title: 'Back', 'aria-label': 'Back', onClick: () => model.nav.back() }, icon('back', 16)) : null

const titleBadge = ({ page }: PageModel) => badge('neutral', span({ class: 'truncate', style: { maxWidth: SPACE['40'] }, title: page.title }, page.title))

const fieldProps = ({ page, text, fills }: PageModel): Props<HTMLInputElement> => ({
  placeholder: page.field?.placeholder ?? page.placeholder ?? 'Search…',
  bindValue: text,
  class: page.field && page.field.kind !== 'text' && 'font-mono',
  onMount: node =>
    effect(() => {
      fills.get()
      untrack(() => atEnd(node))
    }),
})

const submitButton = ({ busy, action, submit }: PageModel) =>
  primaryAction(
    { disabled: () => busy.get() || !action.get()?.enabled, onClick: () => void submit() },
    show(delayed(busy), () => spinner()),
    () => action.get()?.label ?? '',
  )

export const paletteHead = (model: PageModel) => {
  const { page, nested } = model
  const titled = (!nested && page.id !== 'root') || page.field?.kind === 'text'
  const back = backButton(model)
  const title = titled ? titleBadge(model) : null
  if (page.review) return paneHead({ led: nested }, back, title, headTitle(2, page.title))
  if (page.field) return paneHead({ led: nested }, back, title, textInput(fieldProps(model)), submitButton(model))
  return title ? paneHead({ led: nested }, back, title, searchField(fieldProps(model))) : searchRow(fieldProps(model), back ?? undefined)
}
