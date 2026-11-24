import { div, p, section, span, type Child, type Props } from '@vaakx-dev/vrui'
import { metaLook, sectionTitle } from '../heads/text'
import { resetButton, type Reset } from './reset'

interface Head {
  title?: Child
  note?: Child
  action?: Child
  reset?: Reset
}

export type SectionProps = Omit<Props<HTMLElement>, 'title'> & Head

const titleLine = (title: Child, reset?: Reset) => div({ class: 'flex min-w-0 items-center gap-1' }, sectionTitle(title), reset ? resetButton(reset) : null)

const sectionHead = ({ title, note, action, reset }: Head) =>
  div(
    { class: ['flex min-w-0 items-center gap-2', note ? 'mb-3' : 'mb-2'] },
    div({ class: 'flex min-w-0 flex-1 flex-col gap-1' }, title ? titleLine(title, reset) : null, note ? p({ class: metaLook }, note) : null),
    action ? span({ class: 'flex shrink-0 items-center gap-2' }, action) : null,
  )

export const pageSection = ({ title, note, action, reset, class: extra, ...props }: SectionProps, ...rows: Child[]) =>
  section(
    { ...props, class: ['flex min-w-0 flex-col', extra] },
    title || note || action ? sectionHead({ title, note, action, reset }) : null,
    div({ class: 'flex min-w-0 flex-col' }, ...rows),
  )
