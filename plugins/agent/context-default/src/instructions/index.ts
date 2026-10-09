import type { Paths } from '@sand/paths/contract'
import type { Tools } from '@sand/tools/contract'
import type { Instructions } from '../contract'
import { environment } from './environment'
import { projectInstructions } from './project'

export const createInstructions = (tools: Tools, paths: Paths): Instructions => ({
  environment: cwd => environment(cwd, tools.notes()),
  project: (cwd, project) => projectInstructions(paths.projectFolder(cwd, project)),
})
