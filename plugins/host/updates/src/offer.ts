import { stampBuild } from '@sand/boot/build'
import type { BuildInfo } from '@sand/util/release'
import type { ReleaseInfo } from './contract'
import type { GithubRelease } from './github/release'

export const releaseInfo = ({ channel, tag, name, publishedAt, notesUrl, build, android }: GithubRelease): ReleaseInfo => ({
  channel,
  tag,
  name,
  publishedAt,
  notesUrl,
  build: stampBuild(build),
  ...(build.changes?.length ? { changes: build.changes } : {}),
  ...(android && { android }),
})

export const isNewer = (build: BuildInfo, current: BuildInfo) => build.id !== current.id && build.time > current.time
