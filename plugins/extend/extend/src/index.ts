import { cli } from '@sand/config/contract'
import { skills } from '@sand/skills/contract'
import { definePlugin } from 'drydock'
import { join } from 'node:path'

const skillDir = join(import.meta.dir, '..', 'skills', 'sand-plugins')

export default definePlugin({
  name: 'extend',
  inject: { cli },
  apply(ctx) {
    ctx.watch(skills, found => found?.register(skillDir, { plugins: ctx.cli.builtins }))
  },
})
