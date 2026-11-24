import type { ToolSpec } from '@sand/accounts/contract'
import { mcpServer, type McpTools } from '@sand/app-plan'
import { findName } from '@sand/tools/contract'

const MAX_RESULT_CHARS = 500_000

const loading = (tool: ToolSpec) => ({ 'anthropic/alwaysLoad': !tool.deferred, 'anthropic/maxResultSizeChars': MAX_RESULT_CHARS })

const withoutSandSearch = (tools: ToolSpec[]) => tools.filter(tool => tool.name !== findName)

export const toolServer = ({ tools, ...rest }: Omit<McpTools, 'meta'>) => mcpServer({ ...rest, tools: withoutSandSearch(tools), meta: loading })
