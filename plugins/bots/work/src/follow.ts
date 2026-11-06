import { joinDisposers } from '@sand/util'
import { derive, effect, untrack, type Derive } from '@vaakx-dev/vrui'
import type { WorkContext } from './context'
import type { Task } from './tasks'

export const followRunning = (ctx: WorkContext, tasks: Derive<Task[]>) => {
  const running = derive(() =>
    tasks
      .get()
      .filter(task => task.stage === 'run')
      .map(task => task.thread.id)
      .join('\n'),
  )
  effect(() => {
    const ids = running.get().split('\n').filter(Boolean)
    return untrack(() => joinDisposers(...ids.map(id => ctx.threads.watch(id))))
  })
}
