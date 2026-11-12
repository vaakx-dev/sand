import type { Effort } from '@sand/accounts/contract'
import { tiers } from '@sand/sub-model/contract'
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

const parseTier = (value: unknown) => {
  if (value === undefined || value === null) return undefined
  const tier = tiers.find(known => known === value)
  if (!tier) throw new Error(`tier must be one of ${tiers.join(', ')}`)
  return tier
}

const parse = async (path: string, efforts: Effort[]): Promise<AgentDefinition> => {
  const { meta, body: prompt } = parseFrontmatter(await Bun.file(path).text())
  const effort = parseEffort(meta.effort, efforts)
  const tier = parseTier(meta.tier)
  const tools = list(meta.tools)
  return {
    name: String(meta.name ?? basename(path, '.md')),
    description: String(meta.description ?? ''),
    ...(prompt && { prompt }),
    ...(tools && { tools }),
    ...(meta.model != null && { model: String(meta.model) }),
    ...(effort && { effort }),
    ...(tier && { tier }),
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
