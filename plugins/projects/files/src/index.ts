import type { Files } from './contract'
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
    const usable = (cwd?: string): cwd is string => Boolean(cwd && existsSync(cwd))
    ctx.provide('files', files)
    ctx.watch('server', server => {
      if (!server) return
      const disposers = [
        server.handle('files.list', async ({ cwd }) => (usable(cwd) ? files.list(cwd) : [])),
        server.handle('files.grep', async ({ cwd, query }) => (usable(cwd) ? files.grep(cwd, query) : [])),
      ]
      return () => disposers.forEach(dispose => void dispose())
    })
  },
})
