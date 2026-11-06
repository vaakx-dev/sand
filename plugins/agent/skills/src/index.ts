import { sessions } from '@sand/chats/contract'
import type { Conversation } from '@sand/engine/contract'
import { paths } from '@sand/paths/contract'
import { server } from '@sand/server/contract'
import { tools } from '@sand/tools/contract'
import { expandHome } from '@sand/util/fs'
import { watcher } from '@sand/watch/contract'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { z } from 'zod'
import { skills as skillsService, skillsChange, type Skill, type Skills } from './contract'
import { describeForConversation } from './describe'
import { discover } from './discover'
import { expandMentions } from './expand'
import { merge, projectSkills } from './layers'
import { serveSkills } from './serve'
import { skillTool } from './tool'
import { watchRoot } from './watch'

export default definePlugin({
  name: 'skills',
  inject: { paths, tools, watcher },
  config: z.object({ paths: z.array(z.string()).default([]) }),
  async apply(ctx, config) {
    const { home } = ctx.paths
    const roots = [join(home, 'skills'), ...config.paths.map(path => expandHome(path, home))]
    const contributed = new Map<string, Record<string, string>>()
    const changed = () => ctx.get(server)?.broadcast(skillsChange, undefined)
    const project = projectSkills(ctx, roots, changed)
    let global: Skill[] = []
    let live = true
    let generation = 0

    const skills: Skills = {
      list: async (cwd, id) => (cwd ? merge(global, await project(cwd, id)) : global),
      register(dir, values = {}) {
        contributed.set(dir, values)
        void refresh()
        return () => {
          if (contributed.delete(dir)) void refresh()
        }
      },
    }

    const skillsOf = ({ owner, id, cwd }: Conversation) => skills.list(cwd, owner === 'thread' ? (ctx.get(sessions)?.require(id).project ?? null) : null)

    const refresh = async () => {
      const mine = ++generation
      const found = await discover(contributed, roots, error => ctx.report(error))
      if (!live || mine !== generation) return
      global = found
      changed()
    }

    ctx.effect(() => () => {
      live = false
    })
    await refresh()
    ctx.provide(skillsService, skills)
    ctx.effect(() => ctx.tools.register(skillTool(skillsOf)))
    serveSkills(ctx, skills)
    for (const root of roots) ctx.effect(() => watchRoot(ctx.watcher, root, () => void refresh()))
    describeForConversation(ctx, skillsOf)
    expandMentions(ctx, skills)
  },
})
