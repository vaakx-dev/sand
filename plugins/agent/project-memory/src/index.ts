import { sessions } from '@sand/chats/contract'
import { memory, type MemorySpace } from '@sand/memory/contract'
import { paths } from '@sand/paths/contract'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { projectMemorySpace } from './contract'

const PROJECT_ID = /^[\w-]+$/

export default definePlugin({
  name: 'project-memory',
  description: "Gives each project one memory that every thread in it shares, threads started by bots included",
  inject: { sessions, paths },
  apply(ctx) {
    const space: MemorySpace = {
      name: projectMemorySpace,
      title: 'Project memory',
      about: 'Shared by every thread in this project.',
      of: conversation => (conversation.owner === 'thread' ? (ctx.sessions.open(conversation.id)?.project ?? undefined) : undefined),
      folder(project) {
        if (!PROJECT_ID.test(project)) throw new Error(`No project ${project}`)
        return join(ctx.paths.home, 'project-memory', project)
      },
    }
    ctx.watch(memory, found => found?.space(space))
  },
})
