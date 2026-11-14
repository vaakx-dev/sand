import { sessions as sessionsService, type Sessions } from '@sand/chats/contract'
import { server as serverService } from '@sand/server/contract'
import { tools } from '@sand/tools/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { homedir } from 'node:os'
import { type Found, fileRoute, filesChanged, filesFind, filesShow } from '../contract'
import { follower } from './follow'
import { describe } from './found'
import { trailOf } from './history'
import { locate } from './locate'
import { fileResponse } from './route'
import { showTool } from './tool'

const finder = (sessions: () => Sessions | undefined) => async (thread: string, mention: string, cwd?: string) => {
  const session = sessions()?.open(thread)
  const folder = cwd ?? session?.cwd ?? homedir()
  const path = await locate({ mention, cwd: folder, trail: trailOf(session?.messages() ?? [], folder) })
  return path ? describe(path) : undefined
}

export default definePlugin({
  name: 'file-viewer',
  description: 'Finds the files a thread mentions, even by name alone or from a folder the agent changed into, serves them to the page, follows their changes and lets agents open them in the viewer',
  inject: { tools },
  apply(ctx) {
    const find = finder(() => ctx.get(sessionsService))
    const followed = follower(path => void describe(path).then(file => ctx.get(serverService)?.broadcast(filesChanged, file), () => undefined))
    ctx.effect(() => followed.close)

    const found = async ({ thread, mention }: { thread: string; mention: string }): Promise<Found> => {
      const file = await find(thread, mention)
      if (!file) return { missing: mention }
      followed.follow(file.path)
      return { file }
    }

    const show = async (thread: string, cwd: string, mention: string) => {
      const file = await find(thread, mention, cwd)
      if (!file) throw new Error(`There is no file at ${mention}`)
      const server = ctx.get(serverService)
      if (!server?.pages()) return `${file.name} is ready, but no page is open to show it in`
      server.broadcast(filesShow, { thread, path: file.path })
      return `Opened ${file.name} in the file viewer`
    }

    ctx.effect(() => ctx.tools.group({ name: 'files', label: 'File viewer', summary: "open a file in the user's file viewer", load: 'on-demand' }))
    ctx.effect(() => ctx.tools.register(showTool(show)))
    ctx.watch(serverService, server => (server ? joinDisposers(server.handle(filesFind, found), server.route(fileRoute, fileResponse)) : undefined))
  },
})
