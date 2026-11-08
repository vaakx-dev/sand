import { errorMessage, serial } from '@sand/util'
import { writeAtomic } from '@sand/util/fs'
import { z } from 'zod'

const file = z.object({
  path: z.string(),
  from: z.string().optional(),
  kind: z.enum(['added', 'modified', 'deleted', 'renamed', 'untracked', 'conflicted']),
  add: z.number(),
  del: z.number(),
  binary: z.boolean().optional(),
})

const record = z.object({ main: z.string(), commit: z.string(), files: z.array(file), add: z.number(), del: z.number(), at: z.number() })

const stored = z.record(z.string(), record)

export type MergedRecord = z.infer<typeof record>

export type Merged = ReturnType<typeof createMerged>

const load = async (path: string) => {
  const source = Bun.file(path)
  if (!(await source.exists())) return {}
  try {
    return stored.parse(await source.json())
  } catch (error) {
    throw new Error(`Couldn't read ${path}: ${errorMessage(error)}. Fix or move the file; sand won't overwrite it.`)
  }
}

export const createMerged = (path: string, hold: () => () => void) => {
  let data: Record<string, MergedRecord> = {}
  const write = serial()
  const loading = load(path).then(found => {
    data = found
  })

  const save = () =>
    write(async () => {
      await loading
      const release = hold()
      try {
        await writeAtomic(path, JSON.stringify(data, null, 2))
      } finally {
        release()
      }
    })

  return {
    ready: () => loading,
    get: (session: string): MergedRecord | undefined => data[session],
    sessions: () => Object.keys(data),
    put(session: string, merged: MergedRecord) {
      data[session] = merged
      return save()
    },
    drop(session: string) {
      if (!data[session]) return Promise.resolve()
      delete data[session]
      return save()
    },
  }
}
