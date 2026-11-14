import { cliCommands } from '@sand/cli-commands/contract'
import { daemon } from '@sand/host-daemon/contract'
import { definePlugin } from 'drydock'
import { projectAction } from './actions'

const usage = [
  'sand project list                  list projects, pinned first and archived last',
  'sand project pin <project>         put it first in every list and picker of projects; also unarchives it',
  'sand project unpin <project>       stop putting it first',
  'sand project archive <project>     take it out of the lists and pickers; its folders and threads stay',
  'sand project unarchive <project>   bring it back to the lists and pickers',
  '                                   <project> is its name or id',
].join('\n')

export default definePlugin({
  name: 'project-cli',
  description: 'The sand project command: list, pin and archive projects from a script or another agent',
  inject: { cliCommands, daemon },
  apply(ctx) {
    ctx.effect(() =>
      ctx.cliCommands.register({
        name: 'project',
        summary: 'list, pin and archive projects',
        usage,
        options: { json: { type: 'boolean', help: 'sand project: print JSON rows, as project_list returns them' } },
        async run(args, values) {
          const action = projectAction(args, values.json === true)
          if (!action) {
            console.error(`usage:\n${usage}`)
            return 2
          }
          const link = await ctx.daemon.link()
          try {
            return await action(link.call)
          } finally {
            link.close()
          }
        },
      }),
    )
  },
})
