import { mcpTools } from '@sand/mcp-server/contract'
import { definePlugin } from 'drydock'
import { offerRoutineTools } from './tools'

export default definePlugin({
  name: 'bot-routines-tools',
  description: "Offers the tools that set, list, pause and delete bots' reminders and routines to outside agents over MCP",
  apply(ctx) {
    ctx.watch(mcpTools, found => found && offerRoutineTools(found))
  },
})
