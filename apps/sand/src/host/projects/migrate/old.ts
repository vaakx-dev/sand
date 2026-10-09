import { rename } from 'node:fs/promises'
import { join, resolve } from 'node:path'

export interface OldRecord {
  path: string
  added: number
  name?: string
  link?: string
  hidden?: boolean
}

type Fields = Record<string, unknown>

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : undefined)

const parseRecord = (value: unknown): OldRecord[] => {
  if (!value || typeof value !== 'object') return []
  const { path, added, name, link, hidden } = value as Fields
  if (typeof path !== 'string' || !path) return []
  const record: OldRecord = { path: resolve(path), added: typeof added === 'number' && Number.isFinite(added) ? added : 0 }
  if (text(name)) record.name = text(name)
  if (text(link)) record.link = text(link)
  if (typeof hidden === 'boolean') record.hidden = hidden
  return [record]
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
  try {
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
  } catch {
    return []
  }
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
