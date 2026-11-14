import type { MediaView } from '@sand/media/web/contract'
import type { ContextMenu, Kit, MenuSpec } from '@sand/ui-kit/contract'
import { bytes, isArchiveName } from '@sand/util'
import { derive, div, dynamicChild, el, img, list, scoped, show, span, type Sig } from '@vaakx-dev/vrui'
import { contentName, type Held, type Upload } from './contract'

export interface Tray {
  items: Sig<Held[]>
  thread(): string | undefined
  tooLarge(item: Held): string | undefined
  upload(file: File): Upload | undefined
  retry(file: File): void
  remove(item: Held): void
}

export interface ViewParts {
  kit: Kit
  media: MediaView | undefined
  tray: Tray
  picker: HTMLElement
}

type Look = { kind: 'idle' } | { kind: 'busy'; sent: number } | { kind: 'failed'; error: string; retry: boolean }

const thumbClass = 'h-full w-full object-cover'

const pictures = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif'])

const videos = new Set(['video/mp4', 'video/webm', 'video/quicktime'])

const nameOf = (item: Held) => (item instanceof File ? item.name : contentName(item))

const sizeOf = (item: Held) => {
  if (item instanceof File) return item.size
  if (item.type === 'text') return item.text.length
  return item.type === 'context' ? 0 : item.size
}

const isThumb = (media: MediaView | undefined) => (item: Held) =>
  item instanceof File ? pictures.has(item.type) || videos.has(item.type) : item.type === 'image' && Boolean(media)

const isPdf = (item: Held) => (item instanceof File ? item.name.toLowerCase().endsWith('.pdf') : item.type === 'document' && item.mediaType === 'application/pdf')

const percent = (sent: number, total: number) => Math.floor((sent / Math.max(1, total)) * 100)

const lookOf = (tray: Tray, item: Held): Look => {
  const tooLarge = tray.tooLarge(item)
  if (tooLarge) return { kind: 'failed', error: tooLarge, retry: false }
  const upload = item instanceof File ? tray.upload(item) : undefined
  if (!upload || upload.phase === 'done') return { kind: 'idle' }
  if (upload.phase === 'failed') return { kind: 'failed', error: `Upload failed: ${upload.error}`, retry: true }
  return { kind: 'busy', sent: upload.sent }
}

const stalls = { offline: 'Waiting for connection', retrying: 'Retrying' } as const

const statusOf = (tray: Tray, item: Held, look: Look) => {
  if (look.kind === 'failed') return look.error
  const phase = item instanceof File ? tray.upload(item)?.phase : undefined
  return phase === 'offline' || phase === 'retrying' ? stalls[phase] : bytes(sizeOf(item))
}

const retryOf = (tray: Tray, item: Held) => () => {
  if (item instanceof File) tray.retry(item)
}

const attachmentMenu = ({ copyText }: Kit, tray: Tray, item: Held, look: Look): MenuSpec => {
  const retry: MenuSpec['actions'] = look.kind === 'failed' && look.retry ? [{ id: 'retry', label: 'Retry upload', icon: 'retry', group: 'retry', run: retryOf(tray, item) }] : []
  return {
    title: nameOf(item),
    subtitle: statusOf(tray, item, look),
    actions: [
      ...retry,
      { id: 'copy-name', label: 'Copy name', icon: 'copy', group: 'copy', tile: true, run: () => copyText(nameOf(item)) },
      { id: 'remove', label: 'Remove', icon: 'x', group: 'remove', danger: true, quick: true, run: () => tray.remove(item) },
    ],
  }
}

const progressBar = (item: Held, look: () => Look) => {
  const sent = () => {
    const now = look()
    return now.kind === 'busy' ? now.sent : undefined
  }
  return span(
    { class: 'absolute inset-x-0 bottom-0 h-1 overflow-hidden bg-neutral-800', hidden: () => sent() === undefined },
    span({ class: 'block h-full bg-neutral-600 transition-all', style: { width: () => `${percent(sent() ?? 0, sizeOf(item))}%` } }),
  )
}

const localSource = (file: File) => {
  const src = URL.createObjectURL(file)
  scoped(() => URL.revokeObjectURL(src))
  return src
}

const preview = (file: File) =>
  videos.has(file.type)
    ? el('video', { class: thumbClass, src: `${localSource(file)}#t=0.1`, muted: true, playsInline: true, preload: 'metadata', 'aria-label': file.name })
    : img({ class: thumbClass, src: localSource(file), alt: file.name })

const picture = ({ media, tray }: ViewParts, item: Held) => {
  if (item instanceof File) return preview(item)
  if (media && item.type === 'image') return media.image({ block: item }, tray.thread(), { class: thumbClass, alt: nameOf(item) })
  return img({ class: thumbClass, alt: nameOf(item) })
}

const coverClass = 'absolute inset-0 flex items-center justify-center bg-neutral-900/60'

const failedCover = ({ kit, tray }: ViewParts, item: Held, { error, retry }: Extract<Look, { kind: 'failed' }>) =>
  retry
    ? kit.plainButton({ class: [coverClass, 'text-danger-400'], title: `${error}. Retry`, onClick: retryOf(tray, item) }, kit.icon('retry', 'md'))
    : span({ class: [coverClass, 'text-danger-400'] }, kit.icon('alert', 'md'))

const thumbCover = (parts: ViewParts, item: Held, look: Look) => (look.kind === 'failed' ? failedCover(parts, item, look) : null)

const thumb = (parts: ViewParts, menu: ContextMenu, item: Held) => {
  const { kit, tray } = parts
  const look = derive(() => lookOf(tray, item))
  return span(
    {
      class: 'relative block h-16 w-16 shrink-0 overflow-hidden rounded-md ring-1 ring-neutral-700',
      title: () => `${nameOf(item)} · ${statusOf(tray, item, look.get())}`,
      ...menu.target(() => attachmentMenu(kit, tray, item, look.get())),
    },
    picture(parts, item),
    dynamicChild(look, now => thumbCover(parts, item, now)),
    kit.closeButton({ title: 'Remove', size: 'sm', class: 'absolute top-1 right-1 bg-neutral-900/60', onClick: () => tray.remove(item) }),
    progressBar(item, () => look.get()),
  )
}

type Kind = 'failed' | 'pdf' | 'archive' | 'file'

const kindOf = (item: Held, look: Look): Kind => {
  if (look.kind === 'failed') return 'failed'
  if (isPdf(item)) return 'pdf'
  return isArchiveName(nameOf(item)) ? 'archive' : 'file'
}

const icons = { failed: 'alert', pdf: 'file-text', archive: 'file-archive', file: 'file' } as const

const retryLink = ({ kit, tray }: ViewParts, item: Held, look: () => Look) =>
  show(
    () => {
      const now = look()
      return now.kind === 'failed' && now.retry
    },
    () => kit.linkButton({ class: 'shrink-0 text-xs', onClick: retryOf(tray, item) }, 'Retry'),
  )

const fileRow = (parts: ViewParts, menu: ContextMenu, item: Held) => {
  const { kit, tray } = parts
  const look = derive(() => lookOf(tray, item))
  const failed = () => look.get().kind === 'failed'
  const kind = derive(() => kindOf(item, look.get()))
  return div(
    { class: 'relative flex min-h-8 items-center gap-2 text-sm text-neutral-100', ...menu.target(() => attachmentMenu(kit, tray, item, look.get())) },
    span(
      { class: ['inline-flex shrink-0', () => (failed() ? 'text-danger-400' : 'text-neutral-400')] },
      dynamicChild(kind, value => kit.icon(icons[value], 'md')),
    ),
    span({ class: 'min-w-0 flex-1 truncate' }, nameOf(item)),
    span({ class: ['max-w-1/2 shrink-0 truncate text-xs tabular-nums', () => (failed() ? 'text-danger-400' : 'text-neutral-500')] }, () =>
      statusOf(tray, item, look.get()),
    ),
    retryLink(parts, item, () => look.get()),
    kit.closeButton({ title: 'Remove', size: 'sm', surface: 'raised', onClick: () => tray.remove(item) }),
    progressBar(item, () => look.get()),
  )
}

export const shelfView = (parts: ViewParts) => {
  const { items } = parts.tray
  const menu = parts.kit.contextMenu()
  const thumbed = isThumb(parts.media)
  return div(
    { class: 'flex flex-col gap-2', hidden: items.map(held => !held.length) },
    list(
      items.map(held => held.filter(thumbed)),
      item => item,
      item => thumb(parts, menu, item.get()),
      div({ class: 'flex flex-wrap gap-2', hidden: items.map(held => !held.some(thumbed)) }),
    ),
    list(
      items.map(held => held.filter(item => !thumbed(item))),
      item => item,
      item => fileRow(parts, menu, item.get()),
      div({ class: 'flex flex-col', hidden: items.map(held => held.every(thumbed)) }),
    ),
    menu.view(),
    parts.picker,
  )
}
