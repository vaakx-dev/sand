import type { Database } from 'bun:sqlite'

const inlineLimit = 4096

type Fields = Record<string, unknown>

export interface Unsized {
  id: string
  data: string
}

const isInlineMedia = (value: Fields) =>
  (value.type === 'image' || value.type === 'document') &&
  typeof value.mediaType === 'string' &&
  typeof value.data === 'string' &&
  value.data.length >= inlineLimit

const signed = (fields: Fields) => {
  if (fields.type === 'thinking' && typeof fields.signature === 'string') return fields.signature.length
  if (fields.type === 'redacted_thinking' && typeof fields.data === 'string') return fields.data.length
  return 0
}

const unsent = (value: unknown): number => {
  if (!value || typeof value !== 'object') return 0
  if (Array.isArray(value)) return value.reduce<number>((sum, item) => sum + unsent(item), 0)
  const fields = value as Fields
  if (isInlineMedia(fields)) return (fields.data as string).length
  return signed(fields) + Object.values(fields).reduce<number>((sum, item) => sum + unsent(item), 0)
}

export const sentSize = (json: string, data: unknown) => json.length - unsent(data)

export const sizeFiller = (db: Database) => {
  const save = db.query('update entries set size = $size where id = $id')
  return db.transaction((rows: Unsized[]) => {
    const sizes = new Map<string, number>()
    for (const { id, data } of rows) {
      const size = sentSize(data, JSON.parse(data))
      save.run({ id, size })
      sizes.set(id, size)
    }
    return sizes
  })
}
