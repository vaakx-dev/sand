import type { Effort } from '@sand/accounts/contract'
import { errorMessage, parseFrontmatter } from '@sand/util'
import { scanFolder } from '@sand/util/fs'
import { basename, join } from 'node:path'
import type { AgentDefinition } from './contract'
import { parseEffort } from './settings'

export const builtins: AgentDefinition[] = [
  {
    name: 'general',
    description: 'Multi-step work: research, code changes, running commands.',
  },
  {
    name: 'explore',
    description: 'Read-only search and questions about files.',
    tools: ['read', 'glob', 'grep', 'find', 'search', 'outline', 'where', 'shell', 'powershell'],
    prompt: "Read-only. Don't create, change or delete files. Use shell and powershell only for commands that read, like git log, ls or cat.",
  },
]

const list = (value: unknown) => {
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === 'string')
    return value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
}

const parse = async (path: string, efforts: Effort[]): Promise<AgentDefinition> => {
  const { meta, body: prompt } = parseFrontmatter(await Bun.file(path).text())
  const effort = parseEffort(meta.effort, efforts)
  const tools = list(meta.tools)
  return {
    name: String(meta.name ?? basename(path, '.md')),
    description: String(meta.description ?? ''),
    ...(prompt && { prompt }),
    ...(tools && { tools }),
    ...(meta.model != null && { model: String(meta.model) }),
    ...(effort && { effort }),
  }
}

const parseOrReport = async (path: string, efforts: Effort[], report: (error: unknown) => void) => {
  try {
    return [await parse(path, efforts)]
  } catch (error) {
    report(new Error(`${path}: ${errorMessage(error)}`))
    return []
  }
}

export const loadDefinitions = async (dir: string, efforts: Effort[], report: (error: unknown) => void) => {
  const files = await scanFolder(dir, '*.md')
  const parsed = await Promise.all(files.map(file => parseOrReport(join(dir, file), efforts, report)))
  return parsed.flat()
}
