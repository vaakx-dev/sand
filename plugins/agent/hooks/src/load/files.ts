import { existsSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

export interface HookSource {
  path: string
  name: string
  text: string
}

export const readHookFiles = async (dir: string): Promise<HookSource[]> => {
  if (!existsSync(dir)) return []
  const names = (await readdir(dir)).filter(name => name.endsWith('.ts') && !name.endsWith('.d.ts')).sort()
  return Promise.all(names.map(async name => ({ name, path: join(dir, name), text: await Bun.file(join(dir, name)).text() })))
}

export const folderHash = (files: HookSource[]) => {
  const hasher = new Bun.CryptoHasher('sha256')
  for (const file of files) hasher.update(`${file.name}\0${file.text}\0`)
  return hasher.digest('hex')
}
