import { request, type, wireEvent } from '@sand/host-hub/contract'
import type { MarkdownFiles } from '@sand/markdown/contract'
import { service, type Dispose } from 'drydock'
import { z } from 'zod'

export interface FoundFile {
  path: string
  name: string
  size: number
  modified: number
  type: string
  text: boolean
}

export type Found = { file: FoundFile } | { missing: string }

export interface OpenFile extends FoundFile {
  blob(): Promise<Blob>
  bytes(): Promise<Uint8Array<ArrayBuffer>>
  content(): Promise<string>
  link(target: string, label: (Node | string)[]): Node | undefined
}

export interface FileFormat {
  id: string
  extensions: readonly string[]
  render(file: OpenFile): Promise<HTMLElement>
}

export interface FormatAddon {
  label: string
  files: string
  extensions: readonly string[]
}

export interface FileViewer {
  open(thread: string, mention: string): void
  files(thread: string): MarkdownFiles
  render(file: OpenFile): HTMLElement
  format(format: FileFormat): Dispose
}

export const fileRoute = '/file'

export const fileUrl = ({ path, modified }: FoundFile) => `${fileRoute}?${new URLSearchParams({ path, v: String(modified) })}`

export const formatAddons = {
  'file-pdf': { label: 'PDF', files: 'PDFs', extensions: ['pdf'] },
  'file-office': { label: 'Office', files: 'Word, Excel and PowerPoint files', extensions: ['docx', 'xlsx', 'xlsm', 'pptx'] },
  'file-notebooks': { label: 'Notebooks', files: 'Jupyter notebooks', extensions: ['ipynb'] },
  'file-documents': { label: 'Documents', files: 'OpenDocument, EPUB and rich text files', extensions: ['odt', 'ods', 'odp', 'epub', 'rtf'] },
  'file-archives': { label: 'Archives', files: 'Archives', extensions: ['zip', 'jar', 'tar', 'gz', 'tgz'] },
  'file-sqlite': { label: 'SQLite', files: 'SQLite databases', extensions: ['sqlite', 'sqlite3', 'db'] },
  'file-images': { label: 'More images', files: 'TIFF and HEIC images', extensions: ['tif', 'tiff', 'heic', 'heif'] },
  'file-fonts': { label: 'Fonts', files: 'Fonts', extensions: ['ttf', 'otf', 'woff', 'woff2'] },
  mermaid: { label: 'Mermaid', files: 'Mermaid diagrams', extensions: ['mmd', 'mermaid'] },
} satisfies Record<string, FormatAddon>

export const extensionOf = (name: string) => /\.([^./\\]+)$/.exec(name)?.[1]?.toLowerCase() ?? ''

export const filesFind = request('files.find', {
  input: () => z.object({ thread: z.string().min(1), mention: z.string().min(1).max(4096) }),
  output: type<Found>(),
  callers: 'any',
})

export const filesChanged = wireEvent<FoundFile>('files.changed')

export const filesShow = wireEvent<{ thread: string; path: string }>('files.show')

export const fileViewer = service<FileViewer>('fileViewer')
