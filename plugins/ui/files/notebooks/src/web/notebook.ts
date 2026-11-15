import { imageDimensions, IMAGE_HEADER_BYTES } from '@sand/util'
import { z } from 'zod'

type Output =
  | { kind: 'text'; text: string; stream: 'stdout' | 'stderr' }
  | { kind: 'error'; title: string; trace: string }
  | { kind: 'image'; src: string }
  | { kind: 'html'; html: string; fallback: string }
  | { kind: 'markdown'; text: string }
  | { kind: 'refused'; note: string; fallback: string }

interface Shown {
  count: number | null
  output: Output
}

type Cell =
  | { kind: 'markdown'; source: string; images: Map<string, string> }
  | { kind: 'code'; source: string; count: number | null; outputs: Shown[] }
  | { kind: 'raw'; source: string }

interface Notebook {
  language: string
  kernel: string
  cells: Cell[]
}

const MAX_IMAGE_PIXELS = 16_777_216
const BASE64_HEADER_LENGTH = Math.ceil(IMAGE_HEADER_BYTES / 3) * 4
const RASTER_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
const ANSI_ESCAPES = /\u001b\[[\d;]*[A-Za-z]/g

const multiline = z.union([z.string(), z.array(z.string())]).transform(text => (typeof text === 'string' ? text : text.join('')))

const bundle = z.record(z.string(), z.unknown())

const outputSchema = z.discriminatedUnion('output_type', [
  z.object({ output_type: z.literal('stream'), name: z.string().default('stdout'), text: multiline }),
  z.object({ output_type: z.literal('error'), ename: z.string().default(''), evalue: z.string().default(''), traceback: z.array(z.string()).default([]) }),
  z.object({ output_type: z.literal('execute_result'), execution_count: z.number().nullable().default(null), data: bundle }),
  z.object({ output_type: z.literal('display_data'), data: bundle }),
])

const cellSchema = z.discriminatedUnion('cell_type', [
  z.object({ cell_type: z.literal('markdown'), source: multiline, attachments: z.record(z.string(), bundle).default({}) }),
  z.object({ cell_type: z.literal('code'), source: multiline, execution_count: z.number().nullable().default(null), outputs: z.array(outputSchema).default([]) }),
  z.object({ cell_type: z.literal('raw'), source: multiline }),
])

const notebookSchema = z.object({
  nbformat: z.literal(4, { error: 'Only version 4 notebooks can be shown' }),
  metadata: z
    .object({
      kernelspec: z.object({ display_name: z.string().optional(), language: z.string().optional() }).optional(),
      language_info: z.object({ name: z.string().optional() }).optional(),
    })
    .default({}),
  cells: z.array(cellSchema),
})

type Bundle = z.infer<typeof bundle>

const plain = (text: string) => text.replace(ANSI_ESCAPES, '')

const textOf = (data: Bundle, type: string) => {
  const parsed = multiline.safeParse(data[type])
  return parsed.success ? parsed.data : undefined
}

const headerBytes = (base64: string) => {
  const head = base64.slice(0, BASE64_HEADER_LENGTH)
  try {
    return Uint8Array.from(atob(head.slice(0, head.length - (head.length % 4))), char => char.charCodeAt(0))
  } catch {
    return new Uint8Array()
  }
}

const imageProblem = (base64: string) => {
  const size = imageDimensions(headerBytes(base64))
  if (!size) return "An image whose size couldn't be read isn't shown"
  if (size.width * size.height > MAX_IMAGE_PIXELS) return `A ${size.width} × ${size.height} image is too large to show`
  return undefined
}

const svgSource = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

const rasterOutput = (type: string, data: string, fallback: string): Output => {
  const base64 = data.replace(/\s/g, '')
  const note = imageProblem(base64)
  return note ? { kind: 'refused', note, fallback } : { kind: 'image', src: `data:${type};base64,${base64}` }
}

const imageOutput = (data: Bundle, fallback: string): Output | undefined => {
  const svg = textOf(data, 'image/svg+xml')
  if (svg?.trim()) return { kind: 'image', src: svgSource(svg) }
  const type = RASTER_TYPES.find(candidate => textOf(data, candidate))
  return type ? rasterOutput(type, textOf(data, type) ?? '', fallback) : undefined
}

const richOutput = (data: Bundle): Output => {
  const fallback = plain(textOf(data, 'text/plain') ?? '')
  const html = textOf(data, 'text/html')
  if (html?.trim()) return { kind: 'html', html, fallback }
  const markdown = textOf(data, 'text/markdown')
  if (markdown?.trim()) return { kind: 'markdown', text: markdown }
  return imageOutput(data, fallback) ?? { kind: 'text', text: fallback, stream: 'stdout' }
}

const shownOutput = (output: z.infer<typeof outputSchema>): Shown => {
  switch (output.output_type) {
    case 'stream':
      return { count: null, output: { kind: 'text', text: plain(output.text), stream: output.name === 'stderr' ? 'stderr' : 'stdout' } }
    case 'error':
      return { count: null, output: { kind: 'error', title: [output.ename, output.evalue].filter(Boolean).join(': '), trace: plain(output.traceback.join('\n')) } }
    case 'execute_result':
      return { count: output.execution_count, output: richOutput(output.data) }
    case 'display_data':
      return { count: null, output: richOutput(output.data) }
  }
}

const filled = ({ output }: Shown) => {
  switch (output.kind) {
    case 'text':
      return output.text.trim() !== ''
    case 'error':
      return output.title !== '' || output.trace !== ''
    default:
      return true
  }
}

const attachedImages = (attachments: Record<string, Bundle>) =>
  new Map(
    Object.entries(attachments).flatMap(([name, data]) => {
      const image = imageOutput(data, '')
      return image?.kind === 'image' ? [[name, image.src] as const] : []
    }),
  )

const shownCell = (cell: z.infer<typeof cellSchema>): Cell => {
  switch (cell.cell_type) {
    case 'markdown':
      return { kind: 'markdown', source: cell.source, images: attachedImages(cell.attachments) }
    case 'code':
      return { kind: 'code', source: cell.source, count: cell.execution_count, outputs: cell.outputs.map(shownOutput).filter(filled) }
    case 'raw':
      return { kind: 'raw', source: cell.source }
  }
}

const parseNotebook = (text: string): Notebook => {
  const parsed = notebookSchema.safeParse(JSON.parse(text))
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "it isn't a Jupyter notebook")
  const { metadata, cells } = parsed.data
  const language = metadata.language_info?.name ?? metadata.kernelspec?.language ?? ''
  return { language, kernel: metadata.kernelspec?.display_name ?? language, cells: cells.map(shownCell) }
}

export { imageProblem, parseNotebook, type Cell, type Notebook, type Output, type Shown }
