import { expandHome, readState, writeAtomic } from '@sand/util/fs'
import { join } from 'node:path'
import { z } from 'zod'

const DEFAULT_ROOT = '~/Projects'

const savedFile = z.object({ root: z.string().min(1) })

const rootOf = (saved: unknown) => savedFile.safeParse(saved).data?.root ?? DEFAULT_ROOT

const savedRoot = async (file: string) => (await readState(file, rootOf)) ?? DEFAULT_ROOT

export const projectRoot = async (home: string) => {
  const file = join(home, 'project-root.json')
  let root = expandHome(await savedRoot(file))
  return {
    get: () => root,
    async set(next: string) {
      const clean = next.trim()
      if (!clean) throw new Error('Give a folder')
      root = expandHome(clean)
      await writeAtomic(file, `${JSON.stringify({ root })}\n`)
      return root
    },
  }
}

export type ProjectRoot = Awaited<ReturnType<typeof projectRoot>>
