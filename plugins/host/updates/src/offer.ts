import { stampBuild } from '@sand/host-dist/build'
import type { BuildInfo } from '@sand/host-dist/contract'
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
