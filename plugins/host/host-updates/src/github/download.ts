import { bundleAsset } from '@sand/kit/host'
import type { GithubRelease } from './release'
import { GithubError, githubGet } from './request'

const downloadTimeout = 10 * 60_000

const sha256 = (bytes: Uint8Array) => new Bun.CryptoHasher('sha256').update(bytes).digest('hex')

export const downloadRelease = async (release: GithubRelease) => {
  const bytes = await githubGet(release.bundleUrl, downloadTimeout, response => response.bytes())
  if (!bytes) throw new GithubError(`${bundleAsset} of ${release.tag} is gone from GitHub`)
  if (bytes.length !== release.bundleSize) throw new GithubError(`the ${release.tag} download stopped early; try again`)
  if (release.bundleSha256 && sha256(bytes) !== release.bundleSha256) throw new GithubError(`the ${release.tag} download failed its checksum`)
  return bytes
}
