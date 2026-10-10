import { definePlugin } from 'drydock'
import { branch, branches } from './branch'

export default definePlugin({
  name: 'git',
  description: 'Answers git questions about a project folder for the page, such as the current branch',
  uses: { server: 'does nothing' },
  apply(ctx) {
    ctx.watch('server', server => {
      if (!server) return
      const disposers = [
        server.handle('git.branch', ({ cwd }) => branch(cwd)),
        server.handle('git.branches', ({ cwds }) => branches(cwds)),
      ]
      return () => disposers.forEach(dispose => void dispose())
    })
  },
})
