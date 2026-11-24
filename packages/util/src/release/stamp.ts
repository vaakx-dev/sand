import { join } from 'node:path'
import { z } from 'zod'
import { buildStamp, scanApp } from './files'

export interface AppFile {
  path: string
  bytes: Uint8Array
}

const buildId = /^[0-9a-f]{6,64}$/

const change = z.object({ commit: z.string(), type: z.string(), scope: z.string().optional(), summary: z.string() })

const info = z.object({ id: z.string().regex(buildId), time: z.number(), commit: z.string().optional() })

const stamp = info.extend({
  hash: z.string(),
  modules: z.string(),
  links: z.record(z.string(), z.string()),
  bun: z.string(),
  addons: z.record(z.string(), z.string()).optional(),
  committedAt: z.number().optional(),
  changes: z.array(change).optional(),
})

export type BuildChange = z.output<typeof change>

export type BuildInfo = z.output<typeof info>

export type BuildStamp = z.output<typeof stamp>

export const isStamp = (value: unknown): value is BuildStamp => stamp.safeParse(value).success

export const readStamp = async (root: string): Promise<BuildStamp | undefined> => {
  const file = Bun.file(join(root, buildStamp))
  return (await file.exists()) ? stamp.parse(await file.json()) : undefined
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
