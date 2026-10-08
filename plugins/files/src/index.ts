import { workingFolder } from '@sand/host'
import type { Files } from '@sand/protocol'
import { definePlugin } from 'drydock'
import { existsSync } from 'node:fs'
import { cachedList } from './list/list'
import { grepFiles } from './search/grep'

export default definePlugin({
  name: 'files',
  description: 'Lists and searches the files of a project folder, using git when it can',
  uses: { server: 'the page cannot list or search files' },
  apply(ctx) {
    const files: Files = { list: cachedList(), grep: grepFiles }
    const folder = (cwd?: string) => (cwd && existsSync(cwd) ? cwd : workingFolder(ctx))
    ctx.provide('files', files)
    ctx.watch('server', server => {
      if (!server) return
      const disposers = [
        server.handle('files.list', ({ cwd }) => files.list(folder(cwd))),
        server.handle('files.grep', ({ cwd, query }) => files.grep(folder(cwd), query)),
      ]
      return () => disposers.forEach(dispose => void dispose())
    })
  },
})
