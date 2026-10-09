import type { BuildInfo } from '@sand/protocol'
import type { FoundUpdate, UpdateSource } from '../types'

export const newestUpdate = async (sources: UpdateSource[], current: BuildInfo): Promise<FoundUpdate | undefined> => {
  const builds = await Promise.all(sources.map(source => source.latest().catch(() => undefined)))
  let best: FoundUpdate | undefined
  sources.forEach((source, index) => {
    const build = builds[index]
    if (!build || build.id === current.id || build.time <= current.time) return
    if (!best || build.time > best.build.time) best = { source, build }
  })
  return best
}
