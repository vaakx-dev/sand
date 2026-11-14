import type { JobStatus, Morning, MorningLine } from '@sand/bots/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { div, span } from '@vaakx-dev/vrui'
import { momentOf } from './runs'
import { prose, statusMark } from './status'

const lineText = ({ title, status, text }: MorningLine) => {
  switch (status) {
    case 'needs':
      return `${title} needs you: ${text}`
    case 'paused':
      return `${title} is paused.`
    case 'on':
      return `${title}: ${text}`
  }
}

const noteText = ({ status, text }: MorningLine) => {
  switch (status) {
    case 'needs':
      return `Needs you: ${text}`
    case 'paused':
      return 'Paused'
    case 'on':
      return text
  }
}

const lineLook = 'items-start gap-3 rounded-md px-2 py-1.5 hover:bg-neutral-800'

const lead = (kit: Kit, status: JobStatus) =>
  span({ class: 'mt-1 inline-flex shrink-0' }, status === 'needs' ? kit.stateIcon('waiting', 'sm', true) : span({ class: 'inline-flex text-neutral-500' }, kit.icon('right', 'sm')))

const summaryLine = (kit: Kit, line: MorningLine, show: (job: string) => void) =>
  kit.rowButton(
    { class: lineLook, onClick: () => show(line.job) },
    lead(kit, line.status),
    span({ class: 'flex min-w-0 flex-1 flex-col' }, prose(line.status === 'needs' ? 'text-neutral-100' : 'text-neutral-200', lineText(line))),
  )

const morningToday = (morning: Morning | undefined) => (morning && new Date(morning.at).toDateString() === new Date().toDateString() ? morning : undefined)

const morningSection = (kit: Kit, morning: Morning, show: (job: string) => void) =>
  kit.pageSection(
    { title: 'This morning', action: kit.metaLine(momentOf(morning.at)) },
    div({ class: '-mx-2 flex flex-col' }, ...morning.lines.map(line => summaryLine(kit, line, show))),
  )

const noteLine = (kit: Kit, line: MorningLine, show: (job: string) => void) =>
  kit.rowButton(
    { class: lineLook, onClick: () => show(line.job) },
    span({ class: 'mt-1 inline-flex shrink-0' }, statusMark(kit, line.status)),
    span(
      { class: 'flex min-w-0 flex-1 flex-col' },
      span({ class: ['text-sm font-medium', line.status === 'paused' ? 'text-neutral-400' : 'text-neutral-100'] }, line.title),
      prose('text-neutral-400', noteText(line)),
    ),
    span({ class: 'mt-1 inline-flex shrink-0 text-neutral-500' }, kit.icon('right', 'sm')),
  )

const morningNote = (kit: Kit, lines: MorningLine[], show: (job: string) => void) =>
  div(
    { class: 'my-3 flex min-w-0 flex-col gap-1' },
    div({ class: 'flex items-center gap-2 text-neutral-400' }, kit.icon('list-checks', 'sm'), kit.metaLine('This morning’s jobs')),
    div({ class: '-mx-2 flex flex-col' }, ...lines.map(line => noteLine(kit, line, show))),
  )

export { morningNote, morningSection, morningToday }
