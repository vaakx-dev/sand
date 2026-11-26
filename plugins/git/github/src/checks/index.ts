import type { Tools } from '@sand/tools/contract'
import { joinDisposers } from '@sand/util'
import { type ChecksDeps, checksTool } from './tool'

const group = 'github'

export const registerChecks = (tools: Tools, deps: ChecksDeps) =>
  joinDisposers(
    tools.group({ name: group, label: 'GitHub', summary: 'wait for CI on a pull request, branch, tag, commit or workflow run', load: 'on-demand' }),
    tools.register({ ...checksTool(deps), group }),
  )
