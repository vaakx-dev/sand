import { pathKey } from '@sand/git/contract'
import type { GlobalDefault, WorkspaceDefaults, WorkspaceKind } from './contract'
import type { WorktreeDeps } from './deps'

export interface DefaultsRequest {
  cwd: string
  set?: { kind: WorkspaceKind } | undefined
}

const defaultsKey = async (deps: WorktreeDeps, cwd: string) => {
  const local = await deps.repos.local(cwd)
  const folder = local.repo ? local.main : cwd
  const project = deps.projectOf(folder)
  return project ? `project:${project}` : `folder:${pathKey(folder)}`
}

export const workspaceDefaults = async (deps: WorktreeDeps, { cwd, set }: DefaultsRequest): Promise<WorkspaceDefaults> => {
  await deps.store.ready()
  const key = await defaultsKey(deps, cwd)
  if (set) await deps.store.setDefaults(key, set.kind)
  const kind = deps.store.defaults(key)
  return kind ? { kind } : {}
}

export const globalDefault = async (deps: WorktreeDeps, set?: { kind: WorkspaceKind }): Promise<GlobalDefault> => {
  await deps.store.ready()
  if (set) await deps.store.setGlobal(set.kind)
  return { kind: deps.store.global() }
}
