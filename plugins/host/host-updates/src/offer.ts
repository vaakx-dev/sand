import { stampBuild, type GithubRelease } from '@sand/kit/host'
import type { BuildInfo } from '@sand/protocol'
import type { ReleaseInfo } from './contract'

export const buildOf = (build: BuildInfo): BuildInfo => stampBuild(build)

export const releaseInfo = ({ channel, tag, name, publishedAt, notesUrl, build }: GithubRelease): ReleaseInfo => ({
  channel,
  tag,
  name,
  publishedAt,
  notesUrl,
  build: buildOf(build),
  ...(build.changes?.length ? { changes: build.changes } : {}),
})

export const isNewer = (build: BuildInfo, current: BuildInfo) => build.id !== current.id && build.time > current.time
