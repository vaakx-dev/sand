import type { ToolSpec } from '@sand/accounts/contract'
import { findName } from '@sand/tools/contract'

const withoutFindTools = (tools: ToolSpec[]) => tools.filter(tool => tool.name !== findName)

export { withoutFindTools }
