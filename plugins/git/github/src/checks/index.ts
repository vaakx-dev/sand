import type { Tools } from '@sand/tools/contract'
import { joinDisposers } from '@sand/util'
import { type ChecksDeps, checksTool } from './tool'

const group = 'github'

export const registerChecks = (tools: Tools, deps: ChecksDeps) =>
  joinDisposers(
    tools.group({ name: group, label: 'GitHub', summary: "wait for a pull request's CI checks to finish", load: 'on-demand' }),
    tools.register({ ...checksTool(deps), group }),
  )
