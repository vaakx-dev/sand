import { expandHome } from '@sand/kit/fs'
import { join } from 'node:path'

export const projectRoot = async (home: string) => {
  const file = join(home, 'project-root.json')
  const saved = await Bun.file(file).json().catch(() => undefined)
  let root = typeof saved?.root === 'string' && saved.root ? expandHome(saved.root) : expandHome('~/Projects')
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
