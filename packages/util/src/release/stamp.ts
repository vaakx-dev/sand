import { join } from 'node:path'
import { z } from 'zod'
import { buildStamp, scanApp } from './files'

export interface BuildInfo {
  id: string
  time: number
  commit?: string
}

export interface BuildChange {
  commit: string
  type: string
  scope?: string
  summary: string
}

export interface AppFile {
  path: string
  bytes: Uint8Array
}

export interface BuildStamp extends BuildInfo {
  hash: string
  modules: string
  links: Record<string, string>
  bun: string
  addons?: Record<string, string>
  changes?: BuildChange[]
}

const buildId = /^[0-9a-f]{6,64}$/

const stamp = z.object({
  id: z.string().regex(buildId),
  hash: z.string(),
  time: z.number(),
  modules: z.string(),
  links: z.record(z.string(), z.string()),
  bun: z.string(),
})

export const isStamp = (value: unknown): value is BuildStamp => stamp.safeParse(value).success

export const readStamp = async (root: string): Promise<BuildStamp | undefined> => {
  const found: unknown = await Bun.file(join(root, buildStamp))
    .json()
    .catch(() => undefined)
  return isStamp(found) ? found : undefined
}

export const hashFiles = (files: AppFile[]) => {
  const hasher = new Bun.CryptoHasher('sha256')
  for (const { path, bytes } of files) {
    hasher.update(path)
    hasher.update('\0')
    hasher.update(String(bytes.length))
    hasher.update('\0')
    hasher.update(bytes)
  }
  return hasher.digest('hex').slice(0, 12)
}

export const hashApp = async (root: string) => {
  const scan = await scanApp(root)
  const files = await Promise.all(scan.files.map(async ({ path, file }) => ({ path, bytes: await Bun.file(file).bytes() })))
  return { hash: hashFiles(files), files, latest: scan.latest }
}
