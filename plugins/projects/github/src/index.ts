import type {} from '@sand/skills/contract'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { prSummary } from './pr/summary'
import { statusTool } from './tools/status'
import { waitTool } from './tools/wait'

const skills = ['file-pr', 'babysit-pr'].map(name => join(import.meta.dir, '..', 'skills', name))

export default definePlugin({
  name: 'github',
  description: 'GitHub pull request tools and skills: a short PR status in one call, waiting for checks and feedback, filing and babysitting PRs',
  inject: ['tools'],
  uses: { skills: 'the agent gets no PR skills', server: 'the page cannot read a branch\'s PR' },
  apply(ctx) {
    ctx.effect(() => ctx.tools.register(statusTool))
    ctx.effect(() => ctx.tools.register(waitTool))
    ctx.watch('skills', service => {
      if (!service) return
      const disposers = skills.map(dir => service.register(dir))
      return () => disposers.forEach(dispose => void dispose())
    })
    ctx.watch('server', server => server?.handle('github.pr', ({ cwd }) => prSummary(cwd)))
  },
})
