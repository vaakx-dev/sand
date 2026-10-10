import { expandHome } from '@sand/kit/fs'
import { definePlugin } from 'drydock'
import { mkdir } from 'node:fs/promises'
import { browse } from './browse'

export default definePlugin({
  name: 'folders',
  description: 'Lets the page browse folders and make new ones on this computer',
  uses: { server: 'does nothing: the page cannot browse folders' },
  apply(ctx) {
    ctx.watch('server', server =>
      server?.handle({
        'fs.browse': ({ path }) => browse(expandHome(path)),
        'fs.mkdir': async ({ path }) => {
          await mkdir(expandHome(path), { recursive: true })
        },
      }),
    )
  },
})
