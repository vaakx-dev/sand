import type { GitStatus } from '../contract'
import type { Layout } from './layout'
import { readLocal } from './local'
import { type FetchInfo, readRemote } from './remote'

export const readStatus = async (cwd: string, layout: Layout, fetched: FetchInfo): Promise<GitStatus> => {
  const local = await readLocal(layout)
  return { cwd, local, remote: await readRemote(local, fetched) }
}
