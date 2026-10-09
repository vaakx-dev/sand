import type { BuildInfo, ReleaseInfo } from '@sand/protocol'
import type { GithubRelease } from '../github'

export const buildOf = ({ id, time }: BuildInfo): BuildInfo => ({ id, time })

export const releaseInfo = ({ channel, tag, name, publishedAt, notesUrl, build }: GithubRelease): ReleaseInfo => ({
  channel,
  tag,
  name,
  publishedAt,
  notesUrl,
  build: buildOf(build),
})

export const isNewer = (build: BuildInfo, current: BuildInfo) => build.id !== current.id && build.time > current.time
