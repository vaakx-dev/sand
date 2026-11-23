import { promptBase } from '@sand/prompt/contract'
import type { Context } from 'drydock'
import type { Resolve } from './layers'
import type { Meta } from './meta'

const preamble = `You are a sand subagent doing a task for another agent, with full access to the machine. Decide for yourself and keep working; ask your caller only when you can't go on without an answer. The user may open your chat and write to you; then answer them.

Your final reply goes to the agent that started you: what you found or did, with sources like file paths or links, and results.`

const finder = `You were started to find things. Gather what is relevant and report it; when you can't find something, say so rather than guessing.`

export const agentPrompt = (ctx: Context, resolve: Resolve, meta: Meta) =>
  ctx.on(promptBase, async ([, ...shared], session) => {
    const info = meta(session)
    if (!info || session.kind !== 'agent') return undefined
    const role = info.name && (await resolve(session.cwd, session.project)).get(info.name)?.prompt
    return [preamble, ...(info.role === 'finder' ? [finder] : []), ...(role ? [`# Your role\n\n${role}`] : []), ...shared]
  })
