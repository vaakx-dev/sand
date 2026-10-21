import type { Paths } from '@sand/paths/contract'
import type { Tools } from '@sand/tools/contract'
import type { Instructions } from './contract'
import { join } from 'node:path'

const projectFiles = ['AGENTS.md', 'CLAUDE.md', '.sand/AGENTS.md']

const environment = (cwd: string, notes: string[], model?: string) =>
  [
    '# Environment\n',
    ...(model ? [`- Model: ${model}`] : []),
    `- Working directory: ${cwd}`,
    `- Platform: ${process.platform}`,
    ...notes.map(note => `- ${note}`),
    `- Date: ${new Date().toISOString().slice(0, 10)}`,
  ].join('\n')

const projectFile = async (root: string, name: string) => {
  const file = Bun.file(join(root, name))
  return (await file.exists()) ? `## ${name}\n\n${(await file.text()).trim()}` : undefined
}

const project = async (root: string) => {
  const found = await Promise.all(projectFiles.map(name => projectFile(root, name)))
  return found.filter(Boolean).join('\n\n')
}

export const createInstructions = (tools: Tools, paths: Paths): Instructions => ({
  environment: (session, model) => environment(session.cwd, tools.notes(session), model),
  project: (cwd, projectName) => project(paths.projectFolder(cwd, projectName)),
})
