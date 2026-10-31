import type { WorkspaceDefaults } from './contract'
import type { WorktreeDeps } from './deps'
import { pathKey } from './records/key'

export interface DefaultsRequest {
  cwd: string
  set?: WorkspaceDefaults | undefined
}

const fallback: WorkspaceDefaults = { kind: 'checkout' }

const placeKey = async (deps: WorktreeDeps, cwd: string) => {
  const local = await deps.repos.local(cwd)
  const folder = local.repo ? local.main : cwd
  const project = deps.projectOf(folder)
  return project ? `project:${project}` : `folder:${pathKey(folder)}`
}

export const workspaceDefaults = async (deps: WorktreeDeps, { cwd, set }: DefaultsRequest): Promise<WorkspaceDefaults> => {
  await deps.store.ready()
  const key = await placeKey(deps, cwd)
  if (set) await deps.store.setDefaults(key, set)
  return deps.store.defaults(key) ?? fallback
}
