import { existsSync } from 'node:fs'
import { mkdir, readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { git } from './git'

const isEmpty = async (path: string) => (await readdir(path).catch(() => [])).length === 0

export const createProject = async (root: string, name: string) => {
  const clean = name.trim()
  if (!clean || clean === '.' || clean === '..' || /[\\/]/.test(clean)) throw new Error('Use a plain folder name')
  const path = join(root, clean)
  if (existsSync(path)) throw new Error(`${path} already exists`)
  await mkdir(path, { recursive: true })
  await git(['init', '--quiet'], path)
  return path
}

export const cloneProject = async (url: string, into: string, progress: (text: string) => void) => {
  if (existsSync(into) && !(await isEmpty(into))) throw new Error(`${into} already exists`)
  await mkdir(dirname(into), { recursive: true })
  await git(['clone', '--progress', url, into], dirname(into), progress)
  return into
}
