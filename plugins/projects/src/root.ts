import { expandHome } from '@sand/host'

export const projectRoot = async (file: string, fallback: string) => {
  const saved = await Bun.file(file).json().catch(() => undefined)
  let root = typeof saved?.root === 'string' && saved.root ? saved.root : fallback
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
