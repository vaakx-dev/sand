import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

export const createFolder = async (root: string, name: string) => {
  const clean = name.trim()
  if (!clean || clean === '.' || clean === '..' || /[\\/]/.test(clean)) throw new Error('Use a plain folder name')
  const path = join(root, clean)
  if (existsSync(path)) throw new Error(`${path} already exists`)
  await mkdir(path, { recursive: true })
  return path
}
