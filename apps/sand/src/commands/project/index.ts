import { copyToPc } from './copy'
import type { ProjectFlags } from './flags'
import { listProjects } from './list'
import { addProject, hideProject, projectRoot, removeProject, renameProject, showProject } from './mutate'
import { connectPcs, type Pcs } from './pcs'
import { resolveConflicts } from './resolve'
import { projectStatus } from './status'
import { syncProject } from './sync'
import { usage } from './usage'

type Action = (pcs: Pcs, args: string[], flags: ProjectFlags) => Promise<unknown>

const actions: Record<string, Action> = {
  list: listProjects,
  add: addProject,
  remove: removeProject,
  rename: renameProject,
  hide: hideProject,
  show: showProject,
  root: projectRoot,
  copy: copyToPc,
  sync: syncProject,
  status: projectStatus,
  resolve: resolveConflicts,
}

export const projects = async (home: string, [name = 'list', ...args]: string[], flags: ProjectFlags) => {
  if (!Object.hasOwn(actions, name)) throw new Error(usage)
  await actions[name]!(await connectPcs(home), args, flags)
}
