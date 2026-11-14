import { Database } from 'bun:sqlite'
import { join } from 'node:path'
import type { Page } from 'playwright'

interface Shown {
  id: string
  type: string
  data: unknown
}

const trimmed = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(trimmed)
  if (!value || typeof value !== 'object') return value
  const fields: Record<string, unknown> = { ...value }
  if (fields.type === 'thinking') delete fields.signature
  if (fields.type === 'redacted_thinking') fields.data = ''
  if ((fields.type === 'image' || fields.type === 'document') && typeof fields.data === 'string') delete fields.data
  return Object.fromEntries(Object.entries(fields).map(([key, item]) => [key, trimmed(item)]))
}

const serverPath = (box: string, session: string): Shown[] => {
  const db = new Database(join(box, 'sand.db'), { readonly: true })
  try {
    const head = db.query<{ head: string | null }, [string]>('select head from chats where id = ?').get(session)?.head
    const entry = db.query<{ id: string; parent: string | null; type: string; data: string }, [string, string]>('select id, parent, type, data from entries where id = ? and session = ?')
    const path: Shown[] = []
    for (let at = head ?? null; at; ) {
      const found = entry.get(at, session)
      if (!found) break
      path.push({ id: found.id, type: found.type, data: JSON.parse(found.data) })
      at = found.parent
    }
    return path.reverse()
  } finally {
    db.close()
  }
}

const pagePath = (page: Page, session: string) =>
  page.evaluate(id => {
    const app = (window as unknown as { sand: { get(token: { id: string }): { path(id: string): Shown[] } | undefined } }).sand
    return (app.get({ id: 'threads' })?.path(id) ?? []).map(({ id, type, data }) => ({ id, type, data }))
  }, session)

export const missingFrom = async (page: Page, box: string, session: string) => {
  const shown = await pagePath(page, session)
  const kept = serverPath(box, session)
  const first = kept.findIndex(entry => entry.id === shown[0]?.id)
  if (!shown.length || first < 0) return [`the page holds none of the path of ${session}`]
  const expected = kept.slice(first)
  const problems: string[] = []
  if (expected.length !== shown.length) problems.push(`${session}: the page holds ${shown.length} entries from ${shown[0]!.id} to the head, the PC has ${expected.length}`)
  expected.forEach((entry, index) => {
    const seen = shown[index]
    if (!seen || seen.id !== entry.id) return void problems.push(`${session}: entry ${index} is ${seen?.id} on the page and ${entry.id} on the PC`)
    if (JSON.stringify(trimmed(seen.data)) !== JSON.stringify(trimmed(entry.data))) problems.push(`${session}: entry ${entry.id} differs`)
  })
  return problems
}
