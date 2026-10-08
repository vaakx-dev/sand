import type { Project, SessionSummary } from '@sand/protocol'
import { folderName } from '@sand/kit'
import { isSaved, type ProjectRecord } from './record'

export interface MergeInput {
  records: ProjectRecord[]
  sessions: SessionSummary[]
  quiet: Set<string>
  exists: (path: string) => boolean
}

interface Usage {
  threads: number
  updated: number
  created: number
}

const usageByFolder = (sessions: SessionSummary[]) => {
  const usage = new Map<string, Usage>()
  for (const session of sessions) {
    if (session.kind === 'agent' || !session.cwd) continue
    const known = usage.get(session.cwd)
    usage.set(session.cwd, {
      threads: (known?.threads ?? 0) + 1,
      updated: Math.max(known?.updated ?? 0, session.updated),
      created: Math.min(known?.created ?? Infinity, session.created),
    })
  }
  return usage
}

export const mergeProjects = ({ records, sessions, quiet, exists }: MergeInput): Project[] => {
  const usage = usageByFolder(sessions)
  const byPath = new Map(records.map(record => [record.path, record]))
  const paths = new Set([...byPath.keys(), ...usage.keys()])
  return [...paths].map(path => {
    const record = byPath.get(path)
    const used = usage.get(path)
    const project: Project = {
      name: record?.name ?? folderName(path),
      path,
      added: record?.added ?? used?.created ?? 0,
      source: record && isSaved(record) ? 'saved' : 'used',
      threads: used?.threads ?? 0,
      updated: used?.updated ?? record?.added ?? 0,
    }
    const hidden = record ? record.hidden : quiet.has(path)
    if (hidden) project.hidden = true
    if (record?.link) project.link = record.link
    if (!exists(path)) project.missing = true
    return project
  })
}
