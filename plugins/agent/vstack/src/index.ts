import { skills } from '@sand/skills/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

const skillsDir = join(import.meta.dir, '..', 'skills')

export default definePlugin({
  name: 'vstack',
  async apply(ctx) {
    const dirs = (await readdir(skillsDir)).map(name => join(skillsDir, name))
    ctx.watch(skills, found => found && joinDisposers(...dirs.map(dir => found.register(dir))))
  },
})
