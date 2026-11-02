import { promptSections } from '@sand/prompt/contract'
import { skills } from '@sand/skills/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

const skillsDir = join(import.meta.dir, '..', 'skills')
const prompt = Bun.file(join(import.meta.dir, 'prompt.md')).text()

export default definePlugin({
  name: 'vstack',
  async apply(ctx) {
    const dirs = (await readdir(skillsDir)).map(name => join(skillsDir, name))
    const section = (await prompt).trimEnd()
    ctx.on(promptSections, sections => [...sections, section])
    ctx.watch(skills, found => found && joinDisposers(...dirs.map(dir => found.register(dir))))
  },
})
