import type { BuildInfo } from '@sand/protocol'
import { resolve } from 'node:path'
import { type BuildStamp, hashApp, readStamp } from '../build'
import { validVersion, writeBuildBun } from '../bun/home'
import { createLinks } from './link'
import { hashModules, releaseDamaged, releaseTooOld } from './manifest'
import { checkResolution } from './resolve'

type ReleaseStamp = BuildStamp & Required<Pick<BuildStamp, 'modules' | 'links' | 'bun'>>

const releaseStamp = async (root: string): Promise<ReleaseStamp> => {
  const stamp = await readStamp(root)
  if (!stamp) throw new Error(releaseDamaged)
  const { modules, links, bun } = stamp
  if (typeof modules !== 'string' || !links || typeof links !== 'object' || typeof bun !== 'string') throw new Error(releaseTooOld)
  if (!validVersion.test(bun) || Object.values(links).some(target => typeof target !== 'string')) throw new Error(releaseDamaged)
  return { ...stamp, modules, links, bun }
}

const verifyFiles = async (root: string, stamp: ReleaseStamp) => {
  const [app, modules] = await Promise.all([
    hashApp(root),
    hashModules(root, new Set(Object.keys(stamp.links))).catch(() => undefined),
  ])
  if (app.hash !== stamp.hash || modules !== stamp.modules) throw new Error(releaseDamaged)
}

export const readyRelease = async (dir: string): Promise<{ build: BuildInfo; bun: string }> => {
  const root = resolve(dir)
  const stamp = await releaseStamp(root)
  await verifyFiles(root, stamp)
  await createLinks(root, stamp.links)
  await checkResolution(root)
  await writeBuildBun(root, stamp.bun)
  return { build: { id: stamp.id, time: stamp.time }, bun: stamp.bun }
}

if (import.meta.main) {
  try {
    const dir = process.argv[2]
    if (!dir) throw new Error('usage: bun ready.ts <sand folder>')
    await readyRelease(dir)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
