import { derive, effect, untrack, type Pulse } from '@sand/dom'
import type { Composer } from '@sand/composer-card/contract'
import type { Context } from 'drydock'
import { activeGoal, type Goal } from '../goal'
import { goalBanner } from './banner'

export interface GoalView {
  thread: string
  goal: Goal
  running: boolean
}

const viewOf = (ctx: Context<'threads'>): GoalView | undefined => {
  const thread = ctx.threads.current()
  const goal = thread && activeGoal(ctx.threads.path(thread.id))
  return goal && { thread: thread.id, goal, running: thread.running }
}

export const goalState = (ctx: Context<'threads'>, changes: Pulse) => {
  const key = changes.read(() => JSON.stringify(viewOf(ctx) ?? null))
  const view = derive(() => JSON.parse(key.get()) as GoalView | null)
  const identity = derive(() => {
    const current = view.get()
    return current ? `${current.thread}\n${current.goal.objective}` : ''
  })
  return { view, identity }
}

export type GoalState = ReturnType<typeof goalState>

export const mountGoal = (ctx: Context, composer: Composer, state: GoalState) =>
  effect(() => {
    if (!state.identity.get()) return
    const remove = untrack(() => composer.slot('above', () => goalBanner(ctx, state.view), -10))
    return () => void remove()
  })
