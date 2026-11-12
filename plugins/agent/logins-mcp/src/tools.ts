import type { McpTools } from '@sand/mcp-server/contract'
import { joinDisposers } from '@sand/util'
import { askTools } from './asks'
import { group } from './fields'
import { loginTools } from './logins'
import { managerTools } from './managers'

const tools = [...loginTools, ...managerTools, ...askTools]

const offerLoginTools = (found: McpTools) => joinDisposers(found.group(group), ...tools.map(tool => found.register(tool)))

export { offerLoginTools, tools }
