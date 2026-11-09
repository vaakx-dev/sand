import { promptBase } from '@sand/prompt/contract'
import type { Context } from 'drydock'
import type { Resolve } from './layers'
import type { Meta } from './meta'

const preamble = `You are a sand subagent doing one task for another agent. You have full access to the machine. Nobody will answer questions, so decide yourself.

Finish the task. Your final message is all the other agent sees. Put in what you found or did, with sources, such as file paths or links, and results.`

export const agentPrompt = (ctx: Context, resolve: Resolve, meta: Meta) =>
  ctx.on(promptBase, async (_, session) => {
    const info = meta(session)
    if (!info || session.kind !== 'agent') return undefined
    const role = info.name && (await resolve(session.cwd, session.project)).get(info.name)?.prompt
    return role ? [preamble, `# Your role\n\n${role}`] : [preamble]
  })
