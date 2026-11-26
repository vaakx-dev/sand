import type { ToolSpec } from '@sand/accounts/contract'
import { mcpServer, type McpTools, withoutFindTools } from '@sand/app-plan'

const MAX_RESULT_CHARS = 500_000

const loading = (tool: ToolSpec) => ({ 'anthropic/alwaysLoad': !tool.deferred, 'anthropic/maxResultSizeChars': MAX_RESULT_CHARS })

export const toolServer = ({ tools, ...rest }: Omit<McpTools, 'meta'>) => mcpServer({ ...rest, tools: withoutFindTools(tools), meta: loading })
