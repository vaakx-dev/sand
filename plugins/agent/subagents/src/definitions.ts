import type { Effort } from '@sand/accounts/contract'
import { levels } from '@sand/model/contract'
import { errorMessage, parseFrontmatter } from '@sand/util'
import { scanFolder } from '@sand/util/fs'
import { basename, join } from 'node:path'
import type { AgentDefinition } from './contract'

const list = (value: unknown) => {
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === 'string')
    return value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
}

const parseEffort = (value: unknown, efforts: Effort[]) => {
  if (value === undefined || value === null) return undefined
  const effort = efforts.find(known => known === value)
  if (!effort) throw new Error(`effort must be one of ${efforts.join(', ')}`)
  return effort
}

const parseLevel = (value: unknown) => {
  if (value === undefined || value === null) return undefined
  const level = levels.find(known => known === value)
  if (!level) throw new Error(`level must be one of ${levels.join(', ')}`)
  return level
}

const parse = async (path: string, efforts: Effort[]): Promise<AgentDefinition> => {
  const { meta, body: prompt } = parseFrontmatter(await Bun.file(path).text())
  const effort = parseEffort(meta.effort, efforts)
  const level = parseLevel(meta.level)
  const tools = list(meta.tools)
  return {
    name: String(meta.name ?? basename(path, '.md')),
    description: String(meta.description ?? ''),
    ...(prompt && { prompt }),
    ...(tools && { tools }),
    ...(meta.model != null && { model: String(meta.model) }),
    ...(effort && { effort }),
    ...(level && { level }),
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
