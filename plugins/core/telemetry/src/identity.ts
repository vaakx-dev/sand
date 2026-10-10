import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

export const isId = (value: unknown): value is string => typeof value === 'string' && uuid.test(value)

const read = async (path: string) => {
  const file = Bun.file(path)
  const text = (await file.exists()) ? (await file.text()).trim() : ''
  return isId(text) ? text : ''
}

export const installId = async (home: string) => {
  const path = join(home, 'telemetry-id')
  const existing = await read(path)
  if (existing) return existing
  const id = crypto.randomUUID()
  try {
    await writeFile(path, id, { flag: 'wx', mode: 0o600 })
    return id
  } catch {
    return (await read(path)) || id
  }
}

const personPath = (home: string) => join(home, 'telemetry-person')

export const personId = async (home: string, install: string) => (await read(personPath(home))) || install

export const savePersonId = (home: string, id: string) => writeFile(personPath(home), id, { mode: 0o600 })
