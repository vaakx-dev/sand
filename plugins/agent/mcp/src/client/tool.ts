import type { Progress, Tool as RemoteTool } from '@modelcontextprotocol/client'
import type { Media } from '@sand/media/contract'
import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import { outputOf } from './content'
import type { Link } from './link'

const nameLimit = 64 - 'mcp__sand__'.length

const callTimeoutMs = 10 * 60_000

export const groupOf = (server: string) => `mcp_${server}`

const nameOf = (server: string, tool: string) => `${groupOf(server)}_${tool.replace(/[^A-Za-z0-9_-]/g, '_')}`.slice(0, nameLimit)

const progressText = ({ progress, total, message }: Progress) => message ?? (total ? `${progress}/${total}` : String(progress))

const anyInput = z.looseObject({})

export const toolOf = (server: string, remote: RemoteTool, call: Link['call'], media: Media): Tool<typeof anyInput> => ({
  name: nameOf(server, remote.name),
  description: remote.description || remote.title || remote.name,
  group: groupOf(server),
  parallel: remote.annotations?.readOnlyHint === true,
  timeoutMs: callTimeoutMs,
  input: anyInput.meta(remote.inputSchema),
  async run(input, { signal, progress }) {
    const result = await call(remote.name, input, { signal, timeout: callTimeoutMs, onprogress: update => progress(progressText(update)) })
    return outputOf(media, result)
  },
})
