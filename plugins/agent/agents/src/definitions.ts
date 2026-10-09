import type { Effort } from '@sand/llm-accounts/contract'
import type { AgentDefinition } from './contract'
import { errorMessage } from '@sand/kit'
import { scanFolder } from '@sand/kit/fs'
import { basename, join } from 'node:path'
import { parseFrontmatter } from './frontmatter'
import { parseEffort } from './settings'

export const builtins: AgentDefinition[] = [
  {
    name: 'general',
    description: 'General-purpose agent for multi-step work: research, code changes, running commands.',
  },
  {
    name: 'explore',
    description: 'Read-only agent for finding code, answering questions about a codebase, and broad searches.',
    tools: ['read', 'glob', 'grep', 'shell'],
    prompt: 'You are read-only: never create, modify or delete files. Use shell only for read-only commands such as git log, ls or cat.',
  },
]

const list = (value: unknown) => {
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === 'string') return value.split(',').map(item => item.trim()).filter(Boolean)
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

const loadFolder = async (dir: string, efforts: Effort[], report: (error: unknown) => void) => {
  const files = await scanFolder(dir, '*.md')
  const parsed = await Promise.all(files.map(file => parseOrReport(join(dir, file), efforts, report)))
  return parsed.flat()
}

export const loadDefinitions = async (dirs: string[], efforts: Effort[], report: (error: unknown) => void) => {
  const folders = await Promise.all(dirs.map(dir => loadFolder(dir, efforts, report)))
  return folders.flat()
}
