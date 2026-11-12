import { div, p, section, span, type Child } from '@vaakx-dev/vrui'
import { metaLook, sectionTitle } from '../heads/text'

export interface SectionProps {
  title?: Child
  note?: Child
  action?: Child
}

const sectionHead = ({ title, note, action }: SectionProps) =>
  div(
    { class: ['flex min-w-0 items-center gap-2', note ? 'mb-3' : 'mb-2'] },
    div({ class: 'flex min-w-0 flex-1 flex-col gap-1' }, title ? sectionTitle(title) : null, note ? p({ class: metaLook }, note) : null),
    action ? span({ class: 'flex shrink-0 items-center gap-2' }, action) : null,
  )

export const pageSection = (head: SectionProps, ...rows: Child[]) =>
  section({ class: 'flex min-w-0 flex-col' }, head.title || head.note || head.action ? sectionHead(head) : null, div({ class: 'flex min-w-0 flex-col' }, ...rows))
