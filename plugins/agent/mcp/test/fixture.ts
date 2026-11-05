import { McpServer } from '@modelcontextprotocol/server'
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio'
import { z } from 'zod'

const server = new McpServer({ name: 'fixture', version: '1.0.0' })

server.registerTool('echo', { description: 'Echo the text back', inputSchema: z.object({ text: z.string() }) }, ({ text }) => ({
  content: [{ type: 'text', text: `echo: ${text}` }],
}))

server.registerTool('grow', { description: 'Add the shout tool' }, () => {
  server.registerTool('shout', { description: 'Shout the text', inputSchema: z.object({ text: z.string() }) }, ({ text }) => ({
    content: [{ type: 'text', text: text.toUpperCase() }],
  }))
  return { content: [{ type: 'text', text: 'grown' }] }
})

server.registerTool('fail', { description: 'Answer with a tool error' }, () => ({ content: [{ type: 'text', text: 'it broke' }], isError: true }))

server.registerTool('crash', { description: 'Exit the server process' }, () => process.exit(1))

await server.connect(new StdioServerTransport())
