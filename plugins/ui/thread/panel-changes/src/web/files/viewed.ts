import { sig } from '@vaakx-dev/vrui'
import type { FileChange } from '../../changes/collect'

export type ViewedMarks = Record<string, Record<string, string>>

export const shapeOf = (file: FileChange) => `${file.add}|${file.del}|${file.hunks.length}`

export const viewedFiles = (saved: ViewedMarks, save: (marks: ViewedMarks) => void, thread: () => string | undefined) => {
  const marks = sig(saved)
  const own = () => marks.get()[thread() ?? ''] ?? {}
  const has = (file: FileChange) => own()[file.key] === shapeOf(file)

  const toggle = (file: FileChange) => {
    const id = thread()
    if (!id) return
    const { [file.key]: _, ...rest } = own()
    const next = { ...marks.get(), [id]: has(file) ? rest : { ...rest, [file.key]: shapeOf(file) } }
    save(next)
    marks.set(next)
  }

  return { has, toggle, count: (files: FileChange[]) => files.filter(has).length }
}

export type Viewed = ReturnType<typeof viewedFiles>
