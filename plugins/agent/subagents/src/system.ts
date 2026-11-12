import { promptBase } from '@sand/prompt/contract'
import type { Context } from 'drydock'
import type { Resolve } from './layers'
import type { Meta } from './meta'

const preamble = `You are a sand subagent doing a task for another agent. You have full access to the machine. Decide for yourself rather than asking; the user may open your chat and write to you, and then you answer them.

Finish the task. Your final reply goes back to the agent that started you. Put in what you found or did, with sources, such as file paths or links, and results.`

export const agentPrompt = (ctx: Context, resolve: Resolve, meta: Meta) =>
  ctx.on(promptBase, async (_, session) => {
    const info = meta(session)
    if (!info || session.kind !== 'agent') return undefined
    const role = info.name && (await resolve(session.cwd, session.project)).get(info.name)?.prompt
    return role ? [preamble, `# Your role\n\n${role}`] : [preamble]
  })
