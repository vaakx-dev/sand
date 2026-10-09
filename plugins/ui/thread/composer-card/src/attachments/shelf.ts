import { preview } from '@sand/conversation'
import { derive, div, dynamicChild, icon, iconButton, img, list, span, spinner, SPACE, type Sig } from '@sand/dom'
import type { Attached, Files } from './files'

const size = (bytes: number) => (bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1000))} KB`)

const isImage = (item: Attached) => item.content?.type === 'image'

const thumb = (files: Files, item: Sig<Attached>) =>
  span(
    { class: 'relative block h-16 w-16 shrink-0 overflow-hidden rounded-lg ring-1 ring-neutral-600 animate-rise', title: () => `${item.get().name} · ${size(item.get().bytes)}` },
    img({ class: 'h-full w-full', style: { objectFit: 'cover' }, src: preview(item.get().content!) ?? '', alt: item.get().name }),
    iconButton(
      { size: 'sm', title: 'Remove', class: 'absolute rounded-full bg-black/50 text-white', style: { top: SPACE['1'], right: SPACE['1'] }, onClick: () => files.remove(item.get().id) },
      icon('x', 12),
    ),
  )

const kindOf = (item: Attached) => {
  if (item.loading) return 'loading'
  return item.content?.type === 'document' && item.content.mediaType === 'application/pdf' ? 'pdf' : 'file'
}

const fileRow = (files: Files, item: Sig<Attached>) => {
  const failed = () => Boolean(item.get().error)
  const kind = derive(() => kindOf(item.get()))
  return div(
    { class: 'flex min-h-8 items-center gap-2 text-sm text-neutral-300' },
    span(
      { class: ['inline-flex shrink-0', () => (failed() || kind.get() === 'pdf' ? 'text-danger-400' : 'text-neutral-400')] },
      dynamicChild(kind, value => (value === 'loading' ? spinner(14) : span({ class: 'inline-flex' }, icon(value === 'pdf' ? 'file-text' : 'file', 15)))),
    ),
    span({ class: ['min-w-0 flex-1 truncate', () => (failed() ? 'text-danger-300' : '')] }, () => item.get().name),
    span({ class: ['shrink-0 truncate text-xs', () => (failed() ? 'text-danger-400' : 'text-neutral-500')], style: { maxWidth: '50%' } }, () => item.get().error ?? (item.get().loading ? 'Reading…' : size(item.get().bytes))),
    iconButton({ size: 'sm', title: 'Remove', onClick: () => files.remove(item.get().id) }, icon('x', 13)),
  )
}

export const shelf = (files: Files) =>
  div(
    { class: 'flex flex-col', hidden: files.items.map(items => !items.length) },
    list(
      files.items.map(items => items.filter(isImage)),
      item => item.id,
      item => thumb(files, item),
      div({ class: 'mb-3 flex flex-wrap gap-2', hidden: files.items.map(items => !items.some(isImage)) }),
    ),
    list(
      files.items.map(items => items.filter(item => !isImage(item))),
      item => item.id,
      item => fileRow(files, item),
      div({ class: 'mb-2 flex flex-col', hidden: files.items.map(items => items.every(isImage)) }),
    ),
  )
