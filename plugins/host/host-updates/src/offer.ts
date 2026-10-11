import { stampBuild } from '@sand/kit/host'
import type { BuildInfo } from '@sand/protocol'
import type { ReleaseInfo } from './contract'
import type { GithubRelease } from './github/release'

export const releaseInfo = ({ channel, tag, name, publishedAt, notesUrl, build }: GithubRelease): ReleaseInfo => ({
  channel,
  tag,
  name,
  publishedAt,
  notesUrl,
  build: stampBuild(build),
  ...(build.changes?.length ? { changes: build.changes } : {}),
})

export const isNewer = (build: BuildInfo, current: BuildInfo) => build.id !== current.id && build.time > current.time
