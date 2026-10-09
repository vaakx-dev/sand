import { expandHome } from '@sand/kit/fs'
import { definePlugin } from 'drydock'
import { mkdir } from 'node:fs/promises'
import { browse } from './browse'

const makeFolder = async (path: string) => {
  await mkdir(expandHome(path), { recursive: true })
}

export default definePlugin({
  name: 'folders',
  description: 'Lets the page browse folders and make new ones on this computer',
  uses: { server: 'does nothing: the page cannot browse folders' },
  apply(ctx) {
    ctx.watch('server', server => {
      if (!server) return
      const disposers = [
        server.handle('fs.browse', ({ path }) => browse(expandHome(path))),
        server.handle('fs.mkdir', ({ path }) => makeFolder(path)),
      ]
      return () => disposers.forEach(dispose => void dispose())
    })
  },
})
