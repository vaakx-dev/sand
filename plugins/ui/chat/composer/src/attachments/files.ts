import { helloAttachments } from '@sand/attachments/contract'
import type { UserContent } from '@sand/chats/contract'
import { errorMessage } from '@sand/util'
import { wire } from '@sand/web-client/contract'
import { sig } from '@vaakx-dev/vrui'
import type { ComposerContext } from '../context'
import { contentName, fromFile, withFallback } from './content'
import { uploadFile } from './upload'

export type Held = UserContent | File

export interface Attached {
  id: string
  name: string
  bytes: number
  content?: UserContent
  file?: File
  error?: string
  loading?: boolean
}

let next = 0

const sizeOf = (content: UserContent) => {
  if (content.type === 'text') return content.text.length
  if (content.type === 'file') return content.size
  if (typeof content.data !== 'string') return content.size
  if (content.type === 'document' && content.mediaType === 'text/plain') return content.data.length
  return Math.round((content.data.length * 3) / 4)
}

const pending = (file: File): Attached => ({ id: String(++next), name: file.name, bytes: file.size, file })

const wrap = (held: Held): Attached =>
  held instanceof File ? pending(held) : { id: String(++next), name: contentName(held), bytes: sizeOf(held), content: held }

const reading = (file: File): Attached => ({ id: String(++next), name: file.name, bytes: file.size, loading: true })

const contentsOf = (items: Attached[]) => items.flatMap(item => (item.content ? [item.content] : []))

export const heldOf = (items: Attached[]) => items.flatMap((item): Held[] => (item.content ? [item.content] : item.file ? [item.file] : []))

export const createFiles = (ctx: ComposerContext) => {
  const items = sig<Attached[]>([])
  const sent = sig(new Map<string, number>())
  const limits = () => withFallback(ctx.get(wire)?.hello(helloAttachments))

  const read = async (file: File, { loading, ...entry }: Attached): Promise<Attached> => {
    try {
      const result = await fromFile(file, limits())
      return result instanceof File ? { ...entry, file: result } : { ...entry, content: result }
    } catch (error) {
      return { ...entry, error: errorMessage(error) }
    }
  }

  const change = (id: string, update: Partial<Attached>) => items.update(list => list.map(item => (item.id === id ? { ...item, ...update } : item)))

  const fill = (done: Attached) => items.update(list => list.map(item => (item.id === done.id ? done : item)))

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

  const rejected = () => items.get().some(item => item.error)

  return {
    items,
    sent,
    async add(files: Iterable<File>) {
      const picked = [...files].map(file => ({ file, entry: reading(file) }))
      if (!picked.length) return
      items.update(list => [...list, ...picked.map(({ entry }) => entry)])
      await Promise.all(picked.map(async ({ file, entry }) => fill(await read(file, entry))))
    },
    async upload(device: string) {
      await Promise.all(items.get().map(item => send(item, device)))
      if (rejected()) throw new Error('a file could not be uploaded')
      return contentsOf(items.get())
    },
    attach: (contents: UserContent[]) => items.update(list => [...list, ...contents.map(wrap)]),
    set: (held: Held[]) => items.set(held.map(wrap)),
    remove: (id: string) => items.update(list => list.filter(item => item.id !== id)),
    contents: () => contentsOf(items.get()),
    held: () => heldOf(items.get()),
    rejected,
    loading: () => items.get().some(item => item.loading),
  }
}

export type Files = ReturnType<typeof createFiles>
