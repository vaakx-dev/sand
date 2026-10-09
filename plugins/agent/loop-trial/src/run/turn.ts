import type { LoopImpl } from '@sand/loops/contract'
import type { Session } from '@sand/sessions-sqlite/contract'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import type { TrialContext } from '../context'
import type { TrialCheck } from '../contract'
import { turnChecks, type Observed } from './checks'
import { trialTools } from './ping'
import { scriptedLLM } from './scripted'

const prompt = 'Loop trial: call trial_ping once, then reply done.'

const timeLimit = 20_000

export interface TurnTrial {
  session: Session
  checks: TrialCheck[]
}

const observe = async (ctx: TrialContext, impl: LoopImpl, session: Session) => {
  const tools = trialTools()
  const seen: Observed = { failed: false, pings: 0, starts: 0, ends: 0 }
  const mine = (thread: Session) => thread.id === session.id
  const offStart = ctx.on('turn.start', thread => {
    if (mine(thread)) seen.starts++
  })
  const offEnd = ctx.on('turn.end', (thread, result) => {
    if (!mine(thread)) return
    seen.ends++
    seen.result = result
  })
  try {
    await ctx.loops.runWith(impl, session, prompt, { llm: scriptedLLM(), tools: tools.tools, signal: AbortSignal.timeout(timeLimit) })
  } catch (error) {
    seen.failed = true
    seen.error = error
  } finally {
    await offStart()
    await offEnd()
  }
  seen.pings = tools.pings()
  return seen
}

export const trialTurn = async (ctx: TrialContext, impl: LoopImpl, parent?: Session): Promise<TurnTrial> => {
  const session = ctx.sessions.create({ kind: 'agent', ...(parent && { parent: parent.id }), title: `Loop trial: ${impl.name}` })
  const seen = await observe(ctx, impl, session)
  return { session, checks: turnChecks(session, seen) }
}

export const removeTrialThread = async (ctx: TrialContext, session: Session) => {
  ctx.sessions.remove(session.id)
  const scratch = join(ctx.paths.scratchRoot(), session.id)
  if (session.cwd === scratch) await rm(scratch, { recursive: true, force: true })
}
