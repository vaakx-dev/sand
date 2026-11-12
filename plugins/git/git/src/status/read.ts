import type { GitLayout, GitStatus } from '../contract'
import { readLocal } from './local'
import { type FetchInfo, readRemote } from './remote'

export const readStatus = async (cwd: string, layout: GitLayout, defaultBranch: Promise<string | undefined>, fetched: FetchInfo): Promise<GitStatus> => {
  const { local, upstream } = await readLocal(layout, defaultBranch)
  return { cwd, local, remote: await readRemote(local, upstream, fetched) }
}
