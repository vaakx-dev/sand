import { definePlugin } from 'drydock'
import { branch } from './branch'

export default definePlugin({
  name: 'git',
  description: 'Answers git questions about a project folder for the page, such as the current branch',
  uses: { server: 'does nothing' },
  apply(ctx) {
    ctx.watch('server', server => server?.handle('git.branch', ({ cwd }) => branch(cwd)))
  },
})
