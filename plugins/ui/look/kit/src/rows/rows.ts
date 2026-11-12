import { div, list, span, type Child, type Derive, type Props, type Sig } from '@vaakx-dev/vrui'
import { rowButton } from '../buttons/button'
import { metaLook, rowNameLook } from '../heads/text'
import { opensMark } from '../marks/marks'
import { callout } from '../notes/notes'
import { surfaceFill } from '../surface'

const rowShell = 'py-3'

export type SettingsRowProps = Omit<Props<HTMLDivElement>, 'title'> & {
  title: Child
  detail?: Child
  lead?: Child
  onOpen?: () => void
}

const rowLabel = (title: Child, detail?: Child) =>
  div(
    { class: 'flex min-w-24 flex-1 flex-col gap-px' },
    div({ class: ['min-w-0', rowNameLook] }, title),
    detail ? div({ class: metaLook }, detail) : null,
  )

const openerHover = surfaceFill('page').hover

const opener = (onOpen: () => void, label: HTMLElement) =>
  rowButton({ class: ['-mx-2 -my-1.5 flex-1 gap-3 rounded-md px-2 py-1.5 transition-colors', openerHover], onClick: onOpen }, label, opensMark())

export const settingsRow = ({ title, detail, lead, onOpen, class: extra, ...props }: SettingsRowProps, ...controls: Child[]) => {
  const shown = controls.filter(control => control !== null && control !== undefined)
  const label = rowLabel(title, detail)
  return div(
    { ...props, class: ['flex flex-wrap items-center gap-x-6 gap-y-2', rowShell, extra] },
    lead ?? null,
    onOpen ? opener(onOpen, label) : label,
    shown.length ? div({ class: 'ml-auto flex shrink-0 flex-wrap items-center gap-2' }, ...shown) : null,
  )
}

export const sectionRow = (props: Props<HTMLDivElement>, ...children: Child[]) => div({ ...props, class: ['flex items-start gap-3', rowShell] }, ...children)

export const rowList = <T, K>(items: Sig<T[]> | Derive<T[]>, key: (item: T) => K, row: (item: Sig<T>) => HTMLElement) =>
  list(items, key, row, div({ class: 'contents' }))

export const rowDetail = (...children: Child[]) => div({ class: 'flex min-w-0 flex-col gap-2 pb-3' }, ...children)

export const rowWarning = (text: Child, ...actions: Child[]) =>
  rowDetail(
    callout('warning', span({ class: 'min-w-0 flex-1' }, text), actions.length ? div({ class: 'flex shrink-0 flex-wrap items-center gap-2' }, ...actions) : null),
  )
