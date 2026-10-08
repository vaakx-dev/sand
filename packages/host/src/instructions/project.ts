import { join } from 'node:path'

const projectFiles = ['AGENTS.md', 'CLAUDE.md']

export const projectInstructions = async (cwd: string) => {
  const found = await Promise.all(
    projectFiles.map(async name => {
      const file = Bun.file(join(cwd, name))
      return (await file.exists()) ? `## ${name}\n\n${(await file.text()).trim()}` : undefined
    }),
  )
  return found.filter(Boolean).join('\n\n')
}

export const environment = (cwd: string) =>
  `# Environment\n\n- Working directory: ${cwd}\n- Platform: ${process.platform}\n- Date: ${new Date().toISOString().slice(0, 10)}`
