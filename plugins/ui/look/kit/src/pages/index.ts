import { paths } from '@sand/paths/contract'
import { skills as skillsService } from '@sand/skills/contract'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { writePageScript } from './build'

const root = join(import.meta.dir, '..', '..')
const skillDir = join(root, 'skills', 'sand-kit')

export default definePlugin({
  name: 'kit',
  description: "Builds sand's kit into a script HTML pages can include, so a mockup of sand draws with its real components",
  inject: { paths },
  apply(ctx) {
    const script = join(ctx.paths.home, 'kit', 'page.js')
    writePageScript(script).catch(error => ctx.report(error))
    ctx.watch(skillsService, skills =>
      skills?.register(skillDir, { script, kit: join(root, 'src', 'kit.ts'), example: join(root, 'test', 'gallery', 'page.ts'), plugins: join(root, '..', '..', '..') }),
    )
  },
})
