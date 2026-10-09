import type { Command, UI } from '@sand/server/contract'
import type { Session } from '@sand/sessions-sqlite/contract'
import { commandThread, errorMessage } from '@sand/kit'
import type { Context } from 'drydock'
import { activeGoal, describeGoal, entryType, type Goal } from './goal'

type GoalContext = Context<'loop' | 'sessions'>

const start = (ctx: GoalContext, ui: UI, session: Session, prompt: string) =>
  new Promise<void>(resolve => {
    const off = ctx.on('turn.start', started => {
      if (started.id === session.id) resolve()
    })
    ctx.loop
      .run(session, prompt)
      .catch(error => ui.notify(errorMessage(error), 'error'))
      .finally(() => {
        void off()
        resolve()
      })
  })

export const goalCommand = (ctx: GoalContext, ui: UI): Command => ({
  name: 'goal',
  title: 'Goal',
  description: 'Keep working until a condition holds; a separate check decides when it is met',
  args: '[condition | clear]',
  async run(args) {
    const objective = args.trim()
    const session = ui.session()
    const goal = session && activeGoal(session.path())
    if (!objective) return ui.notify(goal ? describeGoal(goal) : 'No goal set. Usage: /goal <condition>')
    if (objective.toLowerCase() === 'clear') {
      if (!session || !goal) return ui.notify('No goal set')
      session.append(entryType, { ...goal, status: 'cleared' } satisfies Goal)
      return ui.notify(`Goal cleared: ${goal.objective}`)
    }
    const target = commandThread(ui, ctx.sessions, ctx.modelSettings)
    target.append(entryType, { objective, status: 'active', checks: 0 } satisfies Goal)
    ui.notify(`Goal set: ${objective}`)
    if (!ctx.loop.active(target)) await start(ctx, ui, target, `Goal: ${objective}`)
  },
})
