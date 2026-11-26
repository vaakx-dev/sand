import type { IconName, Kit } from '@sand/ui-kit/contract'
import { bytes, plural } from '@sand/util'
import type { Shared } from '@sand/web/contract'
import { div, img, span, type Child } from '@vaakx-dev/vrui'
import { firstLine, linkOf } from '../link'

const kindOf = (file: File) => {
  if (file.type.startsWith('image/')) return 'Image'
  const extension = file.name.includes('.') ? file.name.split('.').at(-1) : undefined
  return extension?.toUpperCase() || 'File'
}

const card = (kit: Kit, lead: Child, title: string, meta: string) =>
  div(
    { class: 'flex min-w-0 items-center gap-3 rounded-lg bg-neutral-800 p-2' },
    lead,
    div({ class: 'flex min-w-0 flex-1 flex-col' }, kit.rowTitle(title), kit.metaLine(meta)),
  )

const tile = (kit: Kit, name: IconName) => span({ class: 'inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-neutral-700 text-neutral-400' }, kit.icon(name))

const thumbnail = (file: File) => {
  const address = URL.createObjectURL(file)
  return img({ src: address, alt: '', width: 48, height: 48, class: 'h-12 w-12 shrink-0 rounded-md object-cover', onMount: () => () => URL.revokeObjectURL(address) })
}

const filesMeta = (files: File[]) => {
  const [only] = files
  if (only && files.length === 1) return `${kindOf(only)} · ${bytes(only.size)}`
  return `${plural(files.length, 'file')} · ${bytes(files.reduce((total, file) => total + file.size, 0))}`
}

const filesCard = (kit: Kit, files: File[]) => {
  const [first] = files
  if (!first) return null
  const lead = first.type.startsWith('image/') ? thumbnail(first) : tile(kit, 'file')
  return card(kit, lead, first.name, filesMeta(files))
}

const textCard = (kit: Kit, text: string) => {
  if (!text.trim()) return null
  const link = linkOf(text)
  if (link) return card(kit, tile(kit, 'link'), link.title, link.address)
  return card(kit, tile(kit, 'file-text'), firstLine(text), 'Text')
}

const previews = (kit: Kit, { text, files }: Shared) => [filesCard(kit, files), textCard(kit, text)]

export { previews }
