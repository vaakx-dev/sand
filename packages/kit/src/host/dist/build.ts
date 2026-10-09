import type { HostBundle } from '@sand/host-dist/contract'
import type { BuildInfo } from '@sand/protocol'
import { join } from 'node:path'
import { buildStamp, scanApp } from './files'

export interface AppFile {
  path: string
  bytes: Uint8Array
}

export interface BuildStamp extends BuildInfo {
  hash: string
  modules?: string
  links?: Record<string, string>
  bun?: string
}

export interface Bundle extends HostBundle {
  hash: string
  stamp: BuildStamp
}

export interface AppBuild {
  build: BuildInfo
  hash: string
  files: AppFile[]
}

const cacheTime = 5000
const buildId = /^[0-9a-f]{6,64}$/

export const isStamp = (value: unknown): value is BuildStamp => {
  const stamp = value as Partial<BuildStamp> | null
  return (
    typeof stamp?.id === 'string' &&
    buildId.test(stamp.id) &&
    typeof stamp.hash === 'string' &&
    typeof stamp.time === 'number' &&
    Number.isFinite(stamp.time)
  )
}

export const readStamp = async (root: string): Promise<BuildStamp | undefined> => {
  const stamp = await Bun.file(join(root, buildStamp))
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

export const readBuild = async (root: string): Promise<AppBuild> => {
  const [{ hash, files, latest }, stamp] = await Promise.all([hashApp(root), readStamp(root)])
  const build = stamp ? { id: stamp.id, time: stamp.time } : { id: hash, time: latest }
  return { build, hash, files }
}

type BuildCheck = Omit<AppBuild, 'files'>

const cache = new Map<string, { at: number; promise: Promise<BuildCheck> }>()

export const currentBuild = (root: string): Promise<BuildCheck> => {
  const cached = cache.get(root)
  if (cached && Date.now() - cached.at < cacheTime) return cached.promise
  const promise = readBuild(root).then(({ build, hash }) => ({ build, hash }))
  const entry = { at: Date.now(), promise }
  cache.set(root, entry)
  promise.catch(() => {
    if (cache.get(root) === entry) cache.delete(root)
  })
  return promise
}

export const buildInfo = async (root: string): Promise<BuildInfo> => (await currentBuild(root)).build
