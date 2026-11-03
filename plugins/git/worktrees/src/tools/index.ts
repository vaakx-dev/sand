import type { Loop } from '@sand/loop/contract'
import type { Tools } from '@sand/tools/contract'
import { joinDisposers } from '@sand/util'
import type { WorktreeDeps } from '../deps'
import type { Survey } from '../status/survey'
import { listTool } from './list'
import type { Moves } from './move'
import { newTool } from './new'
import { removeTool } from './remove'

const group = 'worktrees'

export const registerTools = (tools: Tools, deps: WorktreeDeps, survey: Survey, moves: Moves, loop: () => Loop | undefined) =>
  joinDisposers(
    tools.group({ name: group, label: 'Worktrees', summary: 'start threads in their own git worktree, list worktrees with their size and remove them', load: 'on-demand' }),
    ...[newTool(deps, moves, loop), listTool(survey), removeTool(deps, survey)].map(tool => tools.register({ ...tool, group })),
  )
