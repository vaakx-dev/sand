import { promptBase } from '@sand/prompt/contract'
import type { Context } from 'drydock'
import type { Resolve } from './layers'
import type { Meta } from './meta'

const preamble = `You are a sand subagent doing a task for another agent. You have full access to the machine. Decide for yourself and keep working. Only when you can't go on without an answer that your caller or the user has, ask with ask_caller and wait for it. The user may open your chat and write to you, and then you answer them.

Finish the task. Your final reply goes back to the agent that started you. Put in what you found or did, with sources, such as file paths or links, and results.`

const finder = `You were started to find things: files, docs, web pages, or what is on a screen. Gather what is relevant to the task and report it. When you can't find something, say so rather than guessing.`

export const agentPrompt = (ctx: Context, resolve: Resolve, meta: Meta) =>
  ctx.on(promptBase, async ([, ...shared], session) => {
    const info = meta(session)
    if (!info || session.kind !== 'agent') return undefined
    const role = info.name && (await resolve(session.cwd, session.project)).get(info.name)?.prompt
    return [preamble, ...(info.role === 'finder' ? [finder] : []), ...(role ? [`# Your role\n\n${role}`] : []), ...shared]
  })
