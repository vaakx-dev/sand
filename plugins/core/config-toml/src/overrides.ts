import { basename } from 'node:path'

const isBuiltin = (id: string, base: string) => {
  try {
    Bun.resolveSync(`@sand/${id}/package.json`, base)
    return true
  } catch {
    return false
  }
}

export const splitOverrides = (folders: string[], base: string) => {
  const overrides = new Map<string, string>()
  const others: string[] = []
  for (const dir of folders) {
    const id = basename(dir)
    if (isBuiltin(id, base)) overrides.set(id, dir)
    else others.push(dir)
  }
  return { overrides, others }
}
