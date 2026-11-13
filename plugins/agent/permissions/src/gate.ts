import type { ConversationRef } from '@sand/engine/contract'
import { type Act, concealBlock, type Gate, type Secrets, type Tool, type ToolContext } from '@sand/tools/contract'
import { oneLine, plural } from '@sand/util'
import type { Blocked, Decision } from './contract'
import { decide, type Ruling } from './decide'
import type { Ending, Questions } from './questions'
import type { Review, ReviewRequest } from './review'
import type { Scope, Scopes } from './scope'
import type { Stores } from './store'
import type { Logged } from './store/decisions'

export interface GateDeps {
  stores: Stores
  scopes: Scopes
  questions: Questions
  secrets(): Secrets
  review(request: ReviewRequest): Promise<Review> | undefined
  title(conversation: ConversationRef): string
  asked(decision: Decision): void
  changed(): void
}

const SUMMARY_CHARS = 400
const BLOCKS_BEFORE_ASKING = 3
const MINUTE_MS = 60_000

const ruled = (tool: string) => `Not run: a saved rule denies ${tool} here. Tell the user what you wanted to do.`

const denied =
  'Not run: the user denied this call. Don’t try to get the same done another way; tell them what you wanted to do, or ask what to do instead.'

const blockedText = (reason: string) => `Not run: auto mode blocked this call. ${reason} Find a safer way to get this done, or tell the user what you need.`

const expiredText = (minutes: number) =>
  `Not run: the user didn’t answer within ${plural(minutes, 'minute')}, so this call is denied. Carry on with other work, or end your turn saying what you need from them.`

const cancelled = 'Not run: the question about this call was cancelled.'

const moved = 'Not run: sand reloaded its plugins while this call waited for the user. Make the same call again to ask them.'

const keyOf = (tool: string, input: unknown) => `${tool}:${Bun.hash(JSON.stringify(input ?? null)).toString(36)}`

export const createGate = (deps: GateDeps): Gate => {
  const { stores, scopes, questions } = deps
  const streaks = new Map<string, Blocked[]>()

  const record = (act: Act, tool: Tool, { conversation, call, turn }: ToolContext, scope: Scope) => {
    const shown = concealBlock(call, deps.secrets())
    const base: Logged = {
      id: Bun.randomUUIDv7(),
      owner: conversation.owner,
      conversation: conversation.id,
      title: deps.title(conversation),
      turn,
      call: call.id,
      tool: tool.name,
      effect: act.effect,
      summary: oneLine(act.summary ?? JSON.stringify(shown.input), SUMMARY_CHARS),
      key: keyOf(tool.name, call.input),
      mode: scope.mode,
      once: false,
      outcome: 'allowed',
      blocked: [],
      at: Date.now(),
    }
    return (fields: Partial<Logged>) => stores.decisions.add({ ...base, decided: base.at, ...fields })
  }

  const ask = async (log: ReturnType<typeof record>, context: ToolContext, fields: Partial<Logged>) => {
    const minutes = stores.settings.deadlineMinutes()
    const decision = log({ outcome: 'waiting', decided: undefined, deadline: Date.now() + minutes * MINUTE_MS, ...fields })
    deps.asked(decision)
    const done = context.wait({ kind: 'permission', call: context.call.id, title: `Allow ${decision.tool}?` })
    const ending = await questions.wait(decision.id, decision.deadline!, context.signal).finally(done)
    streaks.delete(context.turn)
    if (ending !== 'answered') {
      stores.decisions.settle(decision.id, { outcome: ending === 'expired' ? 'expired' : 'cancelled' })
      deps.changed()
    }
    return refusalFor(ending, minutes, decision.id)
  }

  const refusalFor = (ending: Ending, minutes: number, id: string) => {
    switch (ending) {
      case 'expired':
        return expiredText(minutes)
      case 'cancelled':
        return cancelled
      case 'moved':
        return moved
      case 'answered':
        return stores.decisions.get(id)?.outcome === 'allowed' ? undefined : denied
    }
  }

  const review = async (log: ReturnType<typeof record>, context: ToolContext, act: Act) => {
    const found = await Promise.try(() => deps.review({ conversation: context.conversation, call: concealBlock(context.call, deps.secrets()), act, signal: context.signal })).catch(
      () => undefined,
    )
    if (!found) return ask(log, context, {})
    if (found.allow) {
      streaks.delete(context.turn)
      log({ by: 'auto', reason: found.reason })
      return undefined
    }
    const streak = streaks.get(context.turn) ?? []
    if (streak.length + 1 >= BLOCKS_BEFORE_ASKING) return ask(log, context, { reason: found.reason, blocked: streak })
    const logged = log({ outcome: 'denied', by: 'auto', reason: found.reason })
    streaks.set(context.turn, [...streak, { summary: logged.summary, reason: found.reason }])
    return blockedText(found.reason)
  }

  const settle = (ruling: Ruling, log: ReturnType<typeof record>, context: ToolContext, act: Act, scope: Scope) => {
    if (ruling.verdict === 'deny') {
      log({ outcome: 'denied', by: 'rule', rule: ruling.rule })
      return ruled(context.call.name)
    }
    if (ruling.verdict === 'allow') {
      log({ by: ruling.by, ...(ruling.by === 'rule' && { rule: ruling.rule }) })
      return undefined
    }
    const { owner, id } = context.conversation
    if (stores.decisions.takeGrant(owner, id, keyOf(context.call.name, context.call.input))) {
      log({ by: 'grant' })
      return undefined
    }
    if (scope.mode === 'auto' && !ruling.once) return review(log, context, act)
    return ask(log, context, { once: ruling.once })
  }

  return async (act, tool, context) => {
    const scope = scopes(context.conversation)
    if (scope.mode === 'off') return undefined
    const ruling = decide(stores.rules.list(), { chain: scope.chain, strict: scope.strict, cwd: context.cwd, tool: tool.name, act })
    return settle(ruling, record(act, tool, context, scope), context, act, scope)
  }
}
