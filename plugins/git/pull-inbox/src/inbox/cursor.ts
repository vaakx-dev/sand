export interface Position {
  id?: string
  offset: number
}

const invalid = () => new Error("That page of pull requests can't be found; reload the list.")

export const writeCursor = (id: string, offset: number) => `${id}:${offset}`

export const readCursor = (cursor: string | undefined): Position => {
  if (!cursor) return { offset: 0 }
  const split = cursor.lastIndexOf(':')
  const offset = Number(cursor.slice(split + 1))
  if (split < 1 || !Number.isInteger(offset) || offset < 0) throw invalid()
  return { id: cursor.slice(0, split), offset }
}
