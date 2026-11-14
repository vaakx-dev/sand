import { extensionOf, type OpenFile } from '@sand/file-viewer/contract'
import type { Entry } from './entry'
import { nameOf } from './tree'

interface Inside {
  archive: OpenFile
  entry: Entry
  content: Uint8Array<ArrayBuffer>
  link(target: string, label: (Node | string)[]): Node | undefined
}

const SNIFFED_BYTES = 8192

const TYPES: Record<string, string> = {
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  mp4: 'video/mp4',
  webm: 'video/webm',
  pdf: 'application/pdf',
}

const looksLikeText = (content: Uint8Array) => !content.subarray(0, SNIFFED_BYTES).includes(0)

const openedEntry = ({ archive, entry, content, link }: Inside): OpenFile => {
  const name = nameOf(entry.path)
  const type = TYPES[extensionOf(name)] ?? ''
  const blob = new Blob([content], { type })
  return {
    path: `${archive.path}/${entry.path}`,
    name,
    size: content.length,
    modified: entry.modified,
    type,
    text: looksLikeText(content),
    blob: async () => blob,
    bytes: async () => content,
    content: async () => new TextDecoder().decode(content),
    link,
  }
}

export { openedEntry }
