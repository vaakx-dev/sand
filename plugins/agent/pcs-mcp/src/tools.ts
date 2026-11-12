import { peersList, type PeerView } from '@sand/devices-contract'
import type { McpGroup, McpTool, McpTools } from '@sand/mcp-server/contract'
import { transfersCopy } from '@sand/transfers/contract'
import { joinDisposers } from '@sand/util'
import { isAbsolute, resolve } from 'node:path'
import { z } from 'zod'

const group: McpGroup = { name: 'pcs', label: 'PCs', summary: 'list your PCs and copy files and folders between them' }

const copyTimeoutMs = 60 * 60_000

const listInput = z.object({})

const copyInput = z.object({
  from: z.string().min(1).describe('The file or folder to copy; a full path when it is on another PC'),
  to: z.string().min(1).describe('Where to put it; a full path when it is on another PC. Files are overwritten, folders merged'),
  fromPc: z.string().min(1).optional().describe('The PC that has it, by name (default: this PC)'),
  toPc: z.string().min(1).optional().describe('The PC to copy it to, by name (default: this PC)'),
})

const listed = ({ id, name, platform, status }: PeerView) => ({ id, name, platform, reachable: status.phase === 'connected' })

const pathOn = (pc: string | undefined, path: string, here: string | undefined) => (pc || !here || isAbsolute(path) ? path : resolve(here, path))

const listTool: McpTool<typeof listInput> = {
  name: 'pc_list',
  description: "List your other paired PCs by name, each one's platform and whether this PC can reach it now",
  input: listInput,
  access: 'read',
  group: group.name,
  run: async (_, { call }) => (await call(peersList, {})).map(listed),
}

const copyTool: McpTool<typeof copyInput> = {
  name: 'pc_copy',
  description: 'Copy a file or folder from one of your PCs to another, or within one PC. Returns whether it was a folder, its size in bytes and where it went',
  input: copyInput,
  access: 'operate',
  group: group.name,
  run: ({ from, to, fromPc, toPc }, { call, here }) =>
    call(transfersCopy, { from: pathOn(fromPc, from, here), to: pathOn(toPc, to, here), fromPc, toPc }, { timeout: copyTimeoutMs }),
}

const offerPcTools = (tools: McpTools) => joinDisposers(tools.group(group), tools.register(listTool), tools.register(copyTool))

export { copyTool, listTool, offerPcTools }
