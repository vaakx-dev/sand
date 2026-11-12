import { StdioServerTransport } from '@modelcontextprotocol/server/stdio'
import { startSand } from '@sand/harness'
import { mcpServer } from '../src/server'
import { testTools } from './tools'

const sand = await startSand([{ id: 'fake', models: ['m'], replies: [] }])
const server = mcpServer(work => work(sand.ask), testTools, { access: 'operate', here: import.meta.dir })
server.server.onclose = () => void sand.stop()
await server.connect(new StdioServerTransport())
