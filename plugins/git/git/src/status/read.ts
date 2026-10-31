import type { GitLayout, GitStatus } from '../contract'
import { readLocal } from './local'
import { type FetchInfo, readRemote } from './remote'

export const readStatus = async (cwd: string, layout: GitLayout, fetched: FetchInfo): Promise<GitStatus> => {
  const local = await readLocal(layout)
  return { cwd, local, remote: await readRemote(local, fetched) }
}
