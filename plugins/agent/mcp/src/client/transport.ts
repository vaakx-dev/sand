import { StreamableHTTPClientTransport, type Transport } from '@modelcontextprotocol/client'
import { getDefaultEnvironment, StdioClientTransport } from '@modelcontextprotocol/client/stdio'
import { expandHome } from '@sand/util/fs'
import { expand, expandAll, type ServerConfig } from './config'

const kept = 2000

export interface Opened {
  transport: Transport
  lastLog(): string
}

const stdio = (config: Extract<ServerConfig, { command: string }>): Opened => {
  const transport = new StdioClientTransport({
    command: config.command,
    args: config.args.map(expand),
    env: { ...getDefaultEnvironment(), ...expandAll(config.env) },
    cwd: config.cwd && expandHome(config.cwd),
    stderr: 'pipe',
  })
  let stderr = ''
  transport.stderr?.on('data', (chunk: Buffer) => {
    stderr = (stderr + chunk.toString()).slice(-kept)
  })
  return { transport, lastLog: () => stderr.trim().split('\n').at(-1) ?? '' }
}

const http = (config: Extract<ServerConfig, { url: string }>): Opened => ({
  transport: new StreamableHTTPClientTransport(new URL(config.url), { requestInit: { headers: expandAll(config.headers) } }),
  lastLog: () => '',
})

export const open = (config: ServerConfig) => ('command' in config ? stdio(config) : http(config))
