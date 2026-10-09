import type { Skill, Skills } from './contract'
import { definePlugin } from 'drydock'
import { expandHome } from '@sand/kit/fs'
import { join } from 'node:path'
import { z } from 'zod'
import { describePerThread } from './describe'
import { discover } from './discover'
import { expandMentions } from './expand'
import { merge, projectSkills } from './layers'
import { serveSkills } from './serve'
import { skillTool } from './tool'
import { watchRoot } from './watch'

export default definePlugin({
  name: 'skills',
  inject: ['paths', 'tools', 'watcher'],
  config: z.object({ paths: z.array(z.string()).default([]) }),
  async apply(ctx, config) {
    const { home } = ctx.paths
    const roots = [join(import.meta.dir, '..', 'skills'), join(home, 'skills'), ...config.paths.map(path => expandHome(path, home))]
    const contributed = new Map<string, Record<string, string>>()
    const changed = () => ctx.server?.broadcast('skills.change', [])
    const project = projectSkills(ctx, roots, changed)
    let global: Skill[] = []
    let live = true
    let generation = 0

    const list = async (cwd?: string, id?: string | null) => (cwd ? merge(global, await project(cwd, id)) : global)

    const skills: Skills = {
      list,
      get: async (name, cwd, id) => (await list(cwd, id)).find(skill => skill.name === name),
      register(dir, values = {}) {
        contributed.set(dir, values)
        void refresh()
        return () => {
          if (contributed.delete(dir)) void refresh()
        }
      },
    }

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
    ctx.provide('skills', skills)
    ctx.effect(() => ctx.tools.register(skillTool(skills, global)))
    serveSkills(ctx, skills)
    for (const root of roots) ctx.effect(() => watchRoot(ctx.watcher, root, () => void refresh()))
    describePerThread(ctx, skills)
    expandMentions(ctx, skills)
  },
})
