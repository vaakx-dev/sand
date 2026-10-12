import type { Composer } from '@sand/composer-card/contract'
import type { Pulse } from '@sand/kit/web'
import { derive, effect, untrack } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { activeGoal, type Goal } from '../goal'

export interface GoalView {
  thread: string
  goal: Goal
  running: boolean
}

const viewOf = (ctx: Context<'threads'>): GoalView | undefined => {
  const thread = ctx.threads.current()
  const goal = thread && activeGoal(ctx.threads.path(thread.id, { carried: true }))
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

export const mountGoal = (composer: Composer, state: GoalState, banner: () => HTMLElement) =>
  effect(() => {
    if (!state.identity.get()) return
    const remove = untrack(() => composer.slot('above', banner, -10))
    return () => void remove()
  })
