import type {} from '@sand/loops/contract'
import type { Server } from '@sand/server/contract'
import { definePlugin } from 'drydock'
import { configSchema } from './config'
import { createIntents } from './ops/intents'
import { createNaming } from './ops/naming'
import type { Ops } from './ops/types'
import { serveWorktrees } from './serve'

export default definePlugin({
  name: 'worktrees',
  description: 'Starts threads in git worktrees, moves threads into them, names their branch and folder from the task, sets them up and removes them once their PR is merged',
  inject: ['sessions'],
  config: configSchema,
  uses: {
    server: 'the page cannot list, create, move, rename or remove worktrees',
    names: 'a new worktree takes the thread name instead of a name of its own',
  },
  apply(ctx, config) {
    let server: Server | undefined
    const running = new Set<string>()
    ctx.on('turn.start', session => void running.add(session.id))
    ctx.on('turn.end', session => void running.delete(session.id))
    const ops: Ops = {
      config,
      sessions: ctx.sessions,
      running,
      publish: progress => server?.broadcast('worktrees.progress', [progress]),
      changed: main => server?.broadcast('worktrees.change', [main]),
    }
    const intents = createIntents(ops)
    ctx.on('turn.prompt', intents.apply)
    const naming = createNaming(ops, () => ctx.names)
    ctx.on('turn.end', session => void naming.settle(session))
    ctx.watch('server', found => {
      server = found
      if (!found) return
      const stop = serveWorktrees(found, ops, intents, naming)
      return () => {
        server = undefined
        stop()
      }
    })
  },
})
