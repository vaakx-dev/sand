import { div, section, span, type Child } from '@vaakx-dev/vrui'
import { sectionTitle } from '../heads/text'

export interface SectionProps {
  title?: Child
  action?: Child
}

const sectionHead = ({ title, action }: SectionProps) =>
  div(
    { class: 'flex min-h-8 min-w-0 items-center gap-2' },
    title ? sectionTitle(title) : null,
    action ? span({ class: 'ml-auto flex shrink-0 items-center gap-2' }, action) : null,
  )

export const pageSection = (head: SectionProps, ...rows: Child[]) =>
  section({ class: 'flex min-w-0 flex-col gap-2' }, head.title || head.action ? sectionHead(head) : null, div({ class: 'flex min-w-0 flex-col' }, ...rows))
