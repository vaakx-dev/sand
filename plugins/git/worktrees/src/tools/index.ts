import type { Tools } from '@sand/tools/contract'
import { joinDisposers } from '@sand/util'
import type { WorktreeDeps } from '../deps'
import type { Survey } from '../status/survey'
import { listTool } from './list'
import { removeTool } from './remove'

const group = 'worktrees'

export const registerTools = (tools: Tools, deps: WorktreeDeps, survey: Survey) =>
  joinDisposers(
    tools.group({ name: group, label: 'Worktrees', summary: 'list worktrees with their size and remove them', load: 'on-demand' }),
    ...[listTool(survey), removeTool(deps, survey)].map(tool => tools.register({ ...tool, group })),
  )
