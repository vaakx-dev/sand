import { definePlugin } from 'drydock'
import { branch, branches } from './branch'
import { readLocals } from './status/locals'
import { readStatus } from './status/read'

export default definePlugin({
  name: 'git',
  description: 'Answers git questions about a project folder for the page: the current branch, changed files, unpushed commits and local branches',
  uses: { server: 'does nothing' },
  apply(ctx) {
    ctx.watch('server', server => {
      if (!server) return
      const disposers = [
        server.handle('git.branch', ({ cwd }) => branch(cwd)),
        server.handle('git.branches', ({ cwds }) => branches(cwds)),
        server.handle('git.status', ({ cwd }) => readStatus(cwd)),
        server.handle('git.locals', ({ cwd }) => readLocals(cwd)),
      ]
      return () => disposers.forEach(dispose => void dispose())
    })
  },
})
