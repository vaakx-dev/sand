import { writeFile } from 'node:fs/promises'

const read = async (path: string) => {
  const file = Bun.file(path)
  return (await file.exists()) ? (await file.text()).trim() : ''
}

export const installId = async (path: string) => {
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
