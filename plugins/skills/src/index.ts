import type { Skill, Skills } from '@sand/protocol'
import { definePlugin, type Dispose } from 'drydock'
import { debouncedWatch, expandHome, sandHome, workingFolder } from '@sand/host'
import { join } from 'node:path'
import { z } from 'zod'
import { discover } from './discover'
import { expand, mentions } from './expand'
import { serveSkills } from './serve'
import { skillTool } from './tool'

export default definePlugin({
  name: 'skills',
  inject: ['tools'],
  config: z.object({ paths: z.array(z.string()).default([]) }),
  async apply(ctx, config) {
    const roots = [join(import.meta.dir, '..', 'skills'), join(sandHome(ctx), 'skills'), join(workingFolder(ctx), '.sand', 'skills'), ...config.paths.map(path => expandHome(path))]
    const contributed = new Map<string, Record<string, string>>()
    let current: Skill[] = []
    let unregister: Dispose | undefined
    let live = true
    let generation = 0

    const skills: Skills = {
      list: () => current,
      get: name => current.find(skill => skill.name === name),
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
      current = found
      void unregister?.()
      unregister = current.length ? ctx.tools.register(skillTool(skills)) : undefined
    }

    ctx.effect(() => () => {
      live = false
      void unregister?.()
    })
    await refresh()
    ctx.provide('skills', skills)
    serveSkills(ctx, skills)
    for (const root of roots) ctx.effect(() => debouncedWatch(root, { recursive: true }, () => void refresh()))

    ctx.on('turn.prompt', content => expand(content, [...mentions(content)].flatMap(name => skills.get(name) ?? [])))
  },
})
