import { StdioServerTransport } from '@modelcontextprotocol/server/stdio'
import { startSand } from '@sand/harness'
import { threadsServer } from '../src/server'

const sand = await startSand([{ id: 'fake', models: ['m'], replies: [[{ type: 'text', text: 'pong' }]] }])
const server = threadsServer(work => work(sand.ask), sand.home)
server.server.onclose = () => void sand.stop()
await server.connect(new StdioServerTransport())
