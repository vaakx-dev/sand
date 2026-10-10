import { isRecord } from '@sand/kit'
import { rename } from 'node:fs/promises'
import { join, resolve } from 'node:path'

export interface OldRecord {
  path: string
  added: number
  name?: string
  link?: string
  hidden?: boolean
}

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : undefined)

const parseRecord = (value: unknown): OldRecord[] => {
  if (!isRecord(value) || typeof value.path !== 'string' || !value.path) return []
  const { added, hidden } = value
  const name = text(value.name)
  const link = text(value.link)
  return [
    {
      path: resolve(value.path),
      added: typeof added === 'number' && Number.isFinite(added) ? added : 0,
      ...(name ? { name } : {}),
      ...(link ? { link } : {}),
      ...(typeof hidden === 'boolean' ? { hidden } : {}),
    },
  ]
}

const parseList = (content: string) => {
  try {
    const data: unknown = JSON.parse(content)
    return Array.isArray(data) ? data : undefined
  } catch {
    return undefined
  }
}

export const readOldRecords = async (home: string): Promise<OldRecord[]> => {
  const path = join(home, 'projects.json')
  const file = Bun.file(path)
  if (!(await file.exists())) return []
  const content = await file.text()
  const list = parseList(content)
  if (!list) {
    await rename(path, join(home, 'projects.bad.json'))
    return []
  }
  const backup = Bun.file(join(home, 'projects.v1.json'))
  if (!(await backup.exists())) await Bun.write(backup, content)
  return list.flatMap(parseRecord)
}

export const linkOwners = (records: OldRecord[]) => {
  const owners = new Map<string, OldRecord>()
  for (const record of records) {
    if (!record.link) continue
    const owner = owners.get(record.link)
    if (!owner || record.added > owner.added) owners.set(record.link, record)
  }
  return new Set(owners.values())
}
