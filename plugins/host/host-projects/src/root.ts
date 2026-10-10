import { isRecord } from '@sand/kit'
import { expandHome } from '@sand/kit/fs'
import { join } from 'node:path'

const savedRoot = async (file: string) => {
  const saved: unknown = await Bun.file(file).json().catch(() => undefined)
  return isRecord(saved) && typeof saved.root === 'string' && saved.root ? saved.root : '~/Projects'
}

export const projectRoot = async (home: string) => {
  const file = join(home, 'project-root.json')
  let root = expandHome(await savedRoot(file))
  return {
    get: () => root,
    async set(next: string) {
      const clean = next.trim()
      if (!clean) throw new Error('Give a folder')
      root = expandHome(clean)
      await Bun.write(file, `${JSON.stringify({ root })}\n`)
      return root
    },
  }
}

export type ProjectRoot = Awaited<ReturnType<typeof projectRoot>>
