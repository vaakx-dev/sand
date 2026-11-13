import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import { type Mode, modes, type Permissions, strictness } from './contract'

export const toolGroup = { name: 'permissions', label: 'Permissions', summary: "see and set this chat's permission mode", load: 'on-demand' } as const

const input = z.object({ mode: z.enum(modes).optional().describe('The mode to set; leave it out to see the current one') })

const meanings: Record<Mode, string> = {
  off: 'every call runs',
  ask: 'the user is asked before commands, sends, spending, deleting and files outside the folder',
  auto: 'a reviewer model decides the calls that would have asked the user',
}

export const modeTool = (permissions: () => Permissions): Tool<typeof input> => ({
  name: 'permission_mode',
  group: toolGroup.name,
  description: `See or set this chat's permission mode. off: ${meanings.off}. ask: ${meanings.ask}. auto: ${meanings.auto}. Loosening it asks the user.`,
  input,
  act: ({ mode }, conversation) =>
    mode && strictness[mode] < strictness[permissions().mode(conversation).mode]
      ? { effect: 'run', summary: `Loosen permissions in this chat to ${mode}` }
      : { effect: 'read', summary: mode ? `Set permissions in this chat to ${mode}` : 'See the permission mode' },
  run({ mode }, { conversation }) {
    const state = mode ? permissions().setMode(conversation, mode) : permissions().mode(conversation)
    return `Permissions here: ${state.mode}, so ${meanings[state.mode]}.`
  },
})
