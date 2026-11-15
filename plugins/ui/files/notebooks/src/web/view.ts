import type { OpenFile } from '@sand/file-viewer/contract'
import type { Markdown } from '@sand/markdown/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { bytes, plural } from '@sand/util'
import { div, el, img } from '@vaakx-dev/vrui'
import { htmlProblem } from './html'
import { htmlFrame } from './integrations/frame'
import { nearView } from './near'
import { type Cell, type Notebook, type Output, parseNotebook, type Shown } from './notebook'

interface Parts {
  kit: Kit
  markdown: Markdown | undefined
}

interface Place {
  parts: Parts
  file: OpenFile
  notebook: Notebook
}

const MAX_NOTEBOOK_BYTES = 32 * 1024 * 1024
const SHOWN_LINES = 2_000
const LINE_PX = 18
const OUTPUT_PX = 160

const countLabel = (kit: Kit, prompt: 'In' | 'Out', count: number | null) => kit.monoMeta(`${prompt} [${count ?? ' '}]`)

const outputText = (kit: Kit, text: string, tone: string) => {
  const lines = text.replace(/\n$/, '').split('\n')
  const hidden = lines.length - SHOWN_LINES
  return div(
    { class: 'flex min-w-0 flex-col gap-1' },
    el('pre', { class: ['overflow-x-auto font-mono text-xs whitespace-pre', tone] }, lines.slice(0, SHOWN_LINES).join('\n')),
    hidden > 0 ? kit.metaLine(`${hidden} more lines not shown`) : null,
  )
}

const markdownNodes = ({ parts, file }: Place, source: string, images = new Map<string, string>()) => {
  if (!parts.markdown) return outputText(parts.kit, source, 'text-neutral-100')
  const files = { link: (target: string, label: (Node | string)[]) => file.link(target, label), mention: () => undefined }
  const image = (src: string, alt: string) => {
    const attached = src.startsWith('attachment:') ? images.get(src.slice('attachment:'.length)) : undefined
    return attached ? img({ src: attached, alt, class: 'max-w-full rounded-md' }) : undefined
  }
  return parts.kit.prose(...parts.markdown.nodes(source, { files, image, size: 'reading' }))
}

const refused = (kit: Kit, note: string, fallback: string) =>
  div({ class: 'flex min-w-0 flex-col gap-1' }, kit.metaLine(note), fallback.trim() ? outputText(kit, fallback, 'text-neutral-100') : null)

const htmlOutput = (place: Place, html: string, fallback: string) => {
  const problem = htmlProblem(html)
  if (problem) return refused(place.parts.kit, problem, fallback)
  return nearView(() => htmlFrame(html, `Output of ${place.file.name}`), OUTPUT_PX)
}

const outputView = (place: Place, output: Output) => {
  const { kit } = place.parts
  switch (output.kind) {
    case 'text':
      return outputText(kit, output.text, output.stream === 'stderr' ? 'text-warning-300' : 'text-neutral-100')
    case 'error':
      return div({ class: 'flex min-w-0 flex-col gap-1' }, kit.errorText(output.title), output.trace ? outputText(kit, output.trace, 'text-neutral-200') : null)
    case 'image':
      return img({ src: output.src, alt: 'Output', class: 'max-w-full self-start rounded-md' })
    case 'html':
      return htmlOutput(place, output.html, output.fallback)
    case 'markdown':
      return markdownNodes(place, output.text)
    case 'refused':
      return refused(kit, output.note, output.fallback)
  }
}

const shownView = (place: Place, { count, output }: Shown) => div({ class: 'flex min-w-0 flex-col gap-1' }, count === null ? null : countLabel(place.parts.kit, 'Out', count), outputView(place, output))

const codeCell = (place: Place, cell: Extract<Cell, { kind: 'code' }>) => {
  const { kit, markdown } = place.parts
  const code = kit.codeBlock({ copy: () => cell.source, class: 'whitespace-pre' }, markdown ? markdown.highlight(cell.source, place.notebook.language) : cell.source)
  return div({ class: 'flex min-w-0 flex-col gap-2' }, countLabel(kit, 'In', cell.count), code, ...cell.outputs.map(shown => shownView(place, shown)))
}

const cellView = (place: Place, cell: Cell) => {
  switch (cell.kind) {
    case 'markdown':
      return markdownNodes(place, cell.source, cell.images)
    case 'code':
      return codeCell(place, cell)
    case 'raw':
      return outputText(place.parts.kit, cell.source, 'text-neutral-400')
  }
}

const linesPx = (text: string) => Math.min(text.split('\n').length, SHOWN_LINES) * LINE_PX

const outputPx = ({ output }: Shown) => {
  switch (output.kind) {
    case 'text':
      return linesPx(output.text)
    case 'error':
      return linesPx(output.trace) + LINE_PX
    default:
      return OUTPUT_PX
  }
}

const estimatePx = (cell: Cell) => {
  const sourcePx = linesPx(cell.source)
  return cell.kind === 'code' ? sourcePx + 2 * LINE_PX + cell.outputs.reduce((total, shown) => total + outputPx(shown), 0) : sourcePx
}

const summary = ({ kernel, cells }: Notebook) => [kernel, plural(cells.length, 'cell')].filter(Boolean).join(' · ')

const notebookView = async (parts: Parts, file: OpenFile) => {
  if (file.size > MAX_NOTEBOOK_BYTES) throw new Error(`notebooks up to ${bytes(MAX_NOTEBOOK_BYTES)} can be shown, and this one is ${bytes(file.size)}`)
  const notebook = parseNotebook(await file.content())
  const place = { parts, file, notebook }
  return div(
    { class: 'flex min-w-0 flex-col gap-5 p-4' },
    parts.kit.metaLine(summary(notebook)),
    notebook.cells.length ? null : parts.kit.emptyState({ text: 'This notebook has no cells.' }),
    ...notebook.cells.map(cell => nearView(() => cellView(place, cell), estimatePx(cell))),
  )
}

export { notebookView, type Parts }
