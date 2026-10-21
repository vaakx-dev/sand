import { hashApp, readStamp, type BuildStamp } from '@sand/util/boot/release'
import type { BuildInfo, HostBundle } from '../contract'

export interface Bundle extends HostBundle {
  hash: string
  stamp: BuildStamp
}

const cacheTime = 30_000

export const stampBuild = ({ id, time, commit }: BuildInfo): BuildInfo => ({ id, time, ...(commit && { commit }) })

export const readBuild = async (root: string) => {
  const [{ hash, files, latest }, stamp] = await Promise.all([hashApp(root), readStamp(root)])
  const build: BuildInfo = stamp ? stampBuild(stamp) : { id: hash, time: latest }
  return { build, hash, files, stamp }
}

const readBuildInfo = async (root: string): Promise<BuildInfo> => {
  const stamp = await readStamp(root)
  if (stamp) return stampBuild(stamp)
  const { hash, latest } = await hashApp(root)
  return { id: hash, time: latest }
}

const known = new Map<string, { at: number; build: BuildInfo }>()
const reading = new Map<string, Promise<BuildInfo>>()

const read = (root: string) => {
  const pending =
    reading.get(root) ??
    readBuildInfo(root)
      .then(build => {
        known.set(root, { at: Date.now(), build })
        return build
      })
      .finally(() => reading.delete(root))
  reading.set(root, pending)
  return pending
}

export const buildInfo = async (root: string): Promise<BuildInfo> => {
  const last = known.get(root)
  if (!last) return read(root)
  if (Date.now() - last.at > cacheTime) read(root).catch(() => {})
  return last.build
}
