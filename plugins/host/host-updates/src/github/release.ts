import { bundleAsset, isStamp, stampAsset, type BuildStamp } from '@sand/kit/host'
import type { ReleaseInfo, UpdateChannel } from '../contract'
import { repo, repoApi, type ApiRelease } from './api'
import { GithubError, githubGet } from './request'

export interface GithubRelease extends ReleaseInfo {
  build: BuildStamp
  bundleUrl: string
  bundleSize: number
  bundleSha256?: string
}

const releasePrefix = 'v'
const stampTimeout = 30_000

const published = (release: ApiRelease) => Date.parse(release.published_at ?? '') || 0

const newestTagged = (releases: ApiRelease[]) =>
  releases
    .filter(release => !release.draft && published(release) && release.tag_name.startsWith(releasePrefix))
    .sort((a, b) => published(b) - published(a))[0]

const pick = async (channel: UpdateChannel) => {
  if (channel !== 'release') {
    const release = await repoApi<ApiRelease>(`/releases/tags/${channel}`)
    if (!release || release.draft) throw new GithubError(`there is no ${channel} build of sand on GitHub yet`)
    return release
  }
  const releases = await repoApi<ApiRelease[]>('/releases?per_page=50')
  if (!releases) throw new GithubError(`GitHub has no repository ${repo}`)
  const release = newestTagged(releases)
  if (!release) throw new GithubError(`there is no sand release on GitHub yet`)
  return release
}

const fetchStamp = async (url: string, tag: string): Promise<BuildStamp> => {
  const stamp = await githubGet(url, stampTimeout, response => response.json())
  if (stamp === undefined) throw new GithubError(`${stampAsset} of ${tag} is gone from GitHub`)
  if (!isStamp(stamp)) throw new GithubError(`${stampAsset} of ${tag} is not a sand build stamp`)
  return stamp
}

const sha256 = (digest?: string | null) => (digest?.startsWith('sha256:') ? digest.slice(7).toLowerCase() : undefined)

export const findRelease = async (channel: UpdateChannel): Promise<GithubRelease> => {
  const release = await pick(channel)
  const tag = release.tag_name
  const bundle = release.assets.find(asset => asset.name === bundleAsset)
  const stamp = release.assets.find(asset => asset.name === stampAsset)
  const missing = [bundle ? '' : bundleAsset, stamp ? '' : stampAsset].filter(Boolean)
  if (!bundle || !stamp) throw new GithubError(`${tag} on GitHub has no ${missing.join(' or ')} yet; it may still be uploading`)
  return {
    channel,
    tag,
    name: release.name || tag,
    publishedAt: published(release),
    notesUrl: release.html_url,
    build: await fetchStamp(stamp.browser_download_url, tag),
    bundleUrl: bundle.browser_download_url,
    bundleSize: bundle.size,
    bundleSha256: sha256(bundle.digest),
  }
}
