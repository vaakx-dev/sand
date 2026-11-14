import type { OpenFile } from '@sand/file-viewer/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { div, p, section, span } from '@vaakx-dev/vrui'
import { boundedBytes } from '../source'
import { type Page, type Paragraph, parseRtf, type Run } from './parse'

const MAX_RTF_BYTES = 16 * 1024 * 1024

const runView = ({ text, bold, italic, underline }: Run) => (bold || italic || underline ? span({ class: [bold && 'font-semibold', italic && 'italic', underline && 'underline'] }, text) : text)

const paragraphView = (paragraph: Paragraph) => p({ class: 'mb-1 min-h-5 whitespace-pre-wrap' }, ...paragraph.map(runView))

const pageView = (kit: Kit, page: Page, index: number, count: number) =>
  section(
    { class: ['flex min-w-0 flex-col gap-2 p-4', index > 0 && 'border-t border-neutral-800'] },
    count > 1 ? kit.metaLine(`Page ${index + 1} of ${count}`) : null,
    kit.prose(...page.map(paragraphView)),
  )

const rtfView = async (kit: Kit, file: OpenFile) => {
  const pages = parseRtf(await boundedBytes(file, MAX_RTF_BYTES))
  return div({ class: 'flex min-w-0 flex-col' }, ...pages.map((page, index) => pageView(kit, page, index, pages.length)))
}

export { rtfView }
