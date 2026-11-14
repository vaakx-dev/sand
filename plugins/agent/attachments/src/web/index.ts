import type { UserContent } from '@sand/chats/contract'
import { wire, wireHello } from '@sand/devices-contract'
import { mediaView } from '@sand/media/web/contract'
import { owned, pulse } from '@sand/reactive'
import { uuid } from '@sand/util'
import { definePlugin } from 'drydock'
import { helloAttachments } from '../contract'
import { inject, type ShelfContext } from './context'
import { shelves, type Held, type Progress, type Shelves, type Upload } from './contract'
import { refuseStrayDrops } from './drop'
import { createShelf } from './shelf'
import { createUploads, type Uploads } from './uploads'

const pictures = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp'])

const filesOf = (items: Held[]) => items.filter((item): item is File => item instanceof File)

const stalledOf = (phases: (Upload['phase'] | undefined)[]) => {
  if (phases.includes('offline')) return { stalled: 'offline' as const }
  return phases.includes('retrying') ? { stalled: 'retrying' as const } : {}
}

const progressOf = (uploads: Uploads, items: Held[], device: string | undefined): Progress | undefined => {
  const files = filesOf(items).map(file => ({ file, upload: uploads.state(file, device) }))
  const pending = files.filter(({ upload }) => upload?.phase !== 'done')
  if (!pending.length) return undefined
  return {
    files: pending.length,
    sent: files.reduce((total, { file, upload }) => total + (upload?.phase === 'done' ? file.size : (upload?.sent ?? 0)), 0),
    size: files.reduce((total, { file }) => total + file.size, 0),
    ...stalledOf(pending.map(({ upload }) => upload?.phase)),
  }
}

const previews = (ctx: ShelfContext) => {
  const hashes = new WeakMap<File, string>()
  const imageHash = (file: File) => {
    const known = hashes.get(file)
    if (known) return known
    const hash = `local-${uuid()}`
    hashes.set(file, hash)
    ctx.get(mediaView)?.remember(hash, file)
    return hash
  }
  return (file: File): UserContent =>
    pictures.has(file.type) && ctx.get(mediaView)
      ? { type: 'image', hash: imageHash(file), size: file.size, mediaType: file.type, name: file.name }
      : { type: 'file', name: file.name, path: '', size: file.size, ...(file.type && { mediaType: file.type }) }
}

export default definePlugin({
  name: 'attachment-shelves',
  description: 'Files attached to a message before it is sent: picking, pasting and dropping them, the shelf that shows them, and their upload',
  inject,
  apply(ctx) {
    const attachable = pulse(ctx, [wireHello], [wire]).read(() => Boolean(ctx.wire.hello(helloAttachments)))
    owned(ctx, refuseStrayDrops)
    const uploads = owned(ctx, () => createUploads(ctx))
    const preview = previews(ctx)
    const service: Shelves = {
      create: (items, place) => createShelf(ctx, attachable, uploads, items, place),
      content: uploads.content,
      uploaded: (items, device) =>
        items.flatMap(item => {
          if (!(item instanceof File)) return [item]
          const upload = uploads.state(item, device)
          return upload?.phase === 'done' ? [upload.content] : []
        }),
      progress: (items, device) => progressOf(uploads, items, device),
      shown: (items, device) =>
        items.map(item => {
          if (!(item instanceof File)) return item
          const upload = uploads.state(item, device)
          return upload?.phase === 'done' ? upload.content : preview(item)
        }),
    }
    ctx.provide(shelves, service)
  },
})
