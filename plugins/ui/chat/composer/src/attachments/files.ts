import { helloAttachments } from '@sand/attachments/contract'
import type { UserContent } from '@sand/chats/contract'
import { bytes, errorMessage } from '@sand/util'
import { wire } from '@sand/web-client/contract'
import { sig } from '@vaakx-dev/vrui'
import type { ComposerContext } from '../context'
import { contentName } from './content'
import { uploadFile } from './upload'

export type Held = UserContent | File

export interface Attached {
  id: string
  name: string
  bytes: number
  content?: UserContent
  file?: File
  preview?: string
  error?: string
}

const fallbackUploadBytes = 1024 ** 3

const previewable = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif'])

let next = 0

const sizeOf = (content: UserContent) => (content.type === 'text' ? content.text.length : content.size)

const fromContent = (content: UserContent): Attached => ({ id: String(++next), name: contentName(content), bytes: sizeOf(content), content })

const fromFile = (file: File, limit: number): Attached => {
  const entry = { id: String(++next), name: file.name, bytes: file.size }
  if (file.size > limit) return { ...entry, error: `Larger than ${bytes(limit)}` }
  return { ...entry, file, preview: previewable.has(file.type) ? URL.createObjectURL(file) : undefined }
}

const release = (items: Attached[]) => {
  for (const item of items) if (item.preview) URL.revokeObjectURL(item.preview)
}

const contentsOf = (items: Attached[]) => items.flatMap(item => (item.content ? [item.content] : []))

const heldOf = (items: Attached[]) => items.flatMap((item): Held[] => (item.content ? [item.content] : item.file ? [item.file] : []))

export const createFiles = (ctx: ComposerContext) => {
  const items = sig<Attached[]>([])
  const sent = sig(new Map<string, number>())
  const uploadLimit = () => ctx.get(wire)?.hello(helloAttachments)?.uploadBytes ?? fallbackUploadBytes
  const wrap = (held: Held) => (held instanceof File ? fromFile(held, uploadLimit()) : fromContent(held))
  ctx.effect(() => () => release(items.get()))

  const change = (id: string, update: Partial<Attached>) => items.update(list => list.map(item => (item.id === id ? { ...item, ...update } : item)))

  const track = (id: string, bytes?: number) =>
    sent.update(map => {
      const next = new Map(map)
      if (bytes === undefined) next.delete(id)
      else next.set(id, bytes)
      return next
    })

  const send = async ({ id, file }: Attached, device: string) => {
    if (!file) return
    change(id, { error: undefined })
    track(id, 0)
    try {
      const connected = ctx.get(wire)
      if (!connected) throw new Error('Not connected')
      const content = await uploadFile(connected, device, file, bytes => track(id, bytes))
      change(id, { content, file: undefined })
    } catch (error) {
      change(id, { error: `Upload failed: ${errorMessage(error)}` })
    } finally {
      track(id)
    }
  }

  return {
    items,
    sent,
    add: (files: Iterable<File>) => items.update(list => [...list, ...[...files].map(wrap)]),
    async upload(device: string) {
      await Promise.all(items.get().map(item => send(item, device)))
      if (items.get().some(item => item.error)) throw new Error('a file could not be uploaded')
      return contentsOf(items.get())
    },
    attach: (contents: UserContent[]) => items.update(list => [...list, ...contents.map(wrap)]),
    set(held: Held[]) {
      release(items.get())
      items.set(held.map(wrap))
    },
    remove(id: string) {
      release(items.get().filter(item => item.id === id))
      items.update(list => list.filter(item => item.id !== id))
    },
    held: () => heldOf(items.get()),
    rejected: () => items.get().some(item => item.error && !item.file),
  }
}

export type Files = ReturnType<typeof createFiles>
