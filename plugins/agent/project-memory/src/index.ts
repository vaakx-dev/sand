import { sessions } from '@sand/chats/contract'
import { memory } from '@sand/memory/contract'
import { paths } from '@sand/paths/contract'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { projectId, projectMemorySpace } from './contract'
import { createReplica } from './replica'
import { syncAcrossPcs } from './sync'

export default definePlugin({
  name: 'project-memory',
  description: "Gives each project one memory that every thread in it shares, threads started by bots and threads on any of your PCs included",
  inject: { sessions, paths, memory },
  apply(ctx) {
    const root = join(ctx.paths.home, 'project-memory')
    ctx.effect(() =>
      ctx.memory.space({
        name: projectMemorySpace,
        title: 'Project memory',
        about: 'Shared by every thread in this project, on every PC.',
        of: conversation => (conversation.owner === 'thread' ? (ctx.sessions.open(conversation.id)?.project ?? undefined) : undefined),
        folder(project) {
          if (!projectId().safeParse(project).success) throw new Error(`No project ${project}`)
          return join(root, project)
        },
      }),
    )
    syncAcrossPcs(ctx, createReplica({ memory: ctx.memory, root }))
  },
})
