import type { Conversation } from '@sand/engine/contract'
import type { Server } from '@sand/server/contract'
import type { Tool } from '@sand/tools/contract'
import type { ZodObject } from 'zod'
import { type McpTool, resultText } from '../contract'

const longestWait = 3_600_000
const waitGrace = 60_000

const callerOf = ({ owner, id }: Conversation) => ({ device: 'sand', kind: 'agent', actor: { owner, id } }) as const

export const agentTool = <S extends ZodObject>(server: Server, { name, description, group, always, input, secret, access, act, agents, run }: McpTool<S>): Tool<S> => ({
  name,
  description,
  ...(secret && { secret }),
  ...(group && { group }),
  ...(always && { always }),
  input,
  act: act ?? (() => ({ effect: access === 'read' ? 'read' : 'run' })),
  parallel: access === 'read',
  timeoutMs: longestWait + waitGrace,
  ...(agents && { active: conversation => agents.includes(conversation.owner) }),
  async run(given, { conversation, cwd, signal }) {
    const caller = callerOf(conversation)
    const answer = await run(given, {
      call: (request, body) => server.ask(request, body, caller),
      signal,
      ...(conversation.owner === 'thread' && { here: cwd }),
    })
    return resultText(answer)
  },
})
