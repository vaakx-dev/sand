import type { BuildChange, BuildInfo } from '@sand/host-dist/contract'
import { join } from 'node:path'
import { isRecord } from '../../json/record'
import { buildStamp, scanApp } from './files'

export interface AppFile {
  path: string
  bytes: Uint8Array
}

export interface BuildStamp extends BuildInfo {
  hash: string
  modules: string
  links: Record<string, string>
  bun: string
  changes?: BuildChange[]
}

const buildId = /^[0-9a-f]{6,64}$/

const isLinkMap = (links: unknown): links is Record<string, string> =>
  isRecord(links) && Object.values(links).every(target => typeof target === 'string')

export const isStamp = (value: unknown): value is BuildStamp =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  buildId.test(value.id) &&
  typeof value.hash === 'string' &&
  typeof value.time === 'number' &&
  Number.isFinite(value.time) &&
  typeof value.modules === 'string' &&
  isLinkMap(value.links) &&
  typeof value.bun === 'string'

export const readStamp = async (root: string): Promise<BuildStamp | undefined> => {
  const stamp: unknown = await Bun.file(join(root, buildStamp))
    .json()
    .catch(() => undefined)
  return isStamp(stamp) ? stamp : undefined
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
