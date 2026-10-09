import { join } from 'node:path'

const projectFiles = ['AGENTS.md', 'CLAUDE.md', '.sand/AGENTS.md']

export const projectInstructions = async (root: string) => {
  const found = await Promise.all(
    projectFiles.map(async name => {
      const file = Bun.file(join(root, name))
      return (await file.exists()) ? `## ${name}\n\n${(await file.text()).trim()}` : undefined
    }),
  )
  return found.filter(Boolean).join('\n\n')
}
