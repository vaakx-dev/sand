import { isStamp, type BuildStamp } from '../dist/build'
import { stampAsset } from './repo'
import { GithubError, githubGet } from './request'

export const fetchStamp = async (url: string, tag: string): Promise<BuildStamp> => {
  const stamp = await githubGet(url, 30_000, response => response.json())
  if (stamp === undefined) throw new GithubError(`${stampAsset} of ${tag} is gone from GitHub`)
  if (!isStamp(stamp)) throw new GithubError(`${stampAsset} of ${tag} is not a sand build stamp`)
  return stamp
}
