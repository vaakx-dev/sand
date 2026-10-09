import type { Tools } from '@sand/protocol'

export const toolNotes = (tools?: Tools) => tools?.list().flatMap(tool => (tool.environment ? [tool.environment] : [])) ?? []

export const environment = (cwd: string, notes: string[] = []) =>
  [
    '# Environment\n',
    `- Working directory: ${cwd}`,
    `- Platform: ${process.platform}`,
    ...notes.map(note => `- ${note}`),
    `- Date: ${new Date().toISOString().slice(0, 10)}`,
  ].join('\n')
