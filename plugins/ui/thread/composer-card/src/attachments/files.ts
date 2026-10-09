import type { AttachmentLimits, UserContent } from '@sand/protocol'
import { contentName, fromFile } from '@sand/conversation'
import { errorMessage, sig } from '@sand/dom'

export interface Attached {
  id: string
  name: string
  bytes: number
  content?: UserContent
  error?: string
  loading?: boolean
}

let next = 0

const sizeOf = (content: UserContent) => {
  if (content.type === 'text') return content.text.length
  if (content.type === 'document' && content.mediaType === 'text/plain') return content.data.length
  return Math.round((content.data.length * 3) / 4)
}

const wrap = (content: UserContent): Attached => ({ id: String(++next), name: contentName(content), bytes: sizeOf(content), content })

const placeholder = (file: File): Attached => ({ id: String(++next), name: file.name, bytes: file.size, loading: true })

export const contentsOf = (items: Attached[]) => items.flatMap(item => (item.content ? [item.content] : []))

export const createFiles = (limits: () => AttachmentLimits | undefined) => {
  const items = sig<Attached[]>([])

  const read = async (file: File, { loading, ...entry }: Attached): Promise<Attached> => {
    try {
      return { ...entry, content: await fromFile(file, limits()) }
    } catch (error) {
      return { ...entry, error: errorMessage(error) }
    }
  }

  const fill = (done: Attached) => items.update(list => list.map(item => (item.id === done.id ? done : item)))

  return {
    items,
    async add(files: Iterable<File>) {
      const picked = [...files]
      if (!picked.length) return
      const entries = picked.map(placeholder)
      items.update(list => [...list, ...entries])
      await Promise.all(picked.map(async (file, index) => fill(await read(file, entries[index]!))))
    },
    attach: (contents: UserContent[]) => items.update(list => [...list, ...contents.map(wrap)]),
    set: (contents: UserContent[]) => items.set(contents.map(wrap)),
    remove: (id: string) => items.update(list => list.filter(item => item.id !== id)),
    contents: () => contentsOf(items.get()),
    rejected: () => items.get().some(item => item.error),
    loading: () => items.get().some(item => item.loading),
  }
}

export type Files = ReturnType<typeof createFiles>
