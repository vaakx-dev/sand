import { combinations } from './boot'

combinations([
  ['Calendar alone', ['calendar'], [], ['calendars', 'connections']],
  ['Computer use alone', ['computers'], [], ['computers', 'engine', 'llm', 'tools']],
  ['Several PCs & phone alone', ['pcs'], [], []],
  ['Notifications alone', ['notifications'], [], []],
  ['the MCP server alone', ['mcp-server'], [], []],
  ['Updates alone', ['updates'], [], []],
])
