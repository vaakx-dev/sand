import { cliCommands } from '@sand/cli-commands/contract'
import { cli } from '@sand/config/contract'
import { daemon } from '@sand/host-daemon/contract'
import { definePlugin } from 'drydock'
import { threadAction } from './actions'

const usage = [
  'sand thread start [<dir>] <message | -> start a thread in a folder (default: this one); - reads the message from stdin',
  'sand thread start --pc <pc> <dir> <msg> start a thread on another of your PCs, in a folder on that PC',
  'sand thread send <id> <message | ->     message a thread; a running turn takes it at its next step',
  'sand thread wait <id>                   wait until the thread is done or waits on you',
  'sand thread show <id>                   print what the thread said',
  'sand thread list                        list threads on all your reachable PCs, newest first',
  'sand thread stop <id>                   stop its turn and background commands',
  'sand thread compact <id>                summarize the earlier conversation now; the thread must be idle',
  '                                        exit codes: 0 done, 1 failed, 2 usage, 3 waiting on you, 130 interrupted',
].join('\n')

export default definePlugin({
  name: 'cli-threads',
  description: 'The sand thread command: start, message, wait for, show, list, stop and compact threads from a script or another agent',
  inject: { cli, cliCommands, daemon },
  apply(ctx) {
    ctx.effect(() =>
      ctx.cliCommands.register({
        name: 'thread',
        summary: 'start, message, wait for, show, list, stop and compact threads',
        usage,
        options: {
          wait: { type: 'boolean', help: 'sand thread start and send: wait for the reply and print it' },
          json: { type: 'boolean', help: 'sand thread: print JSON, such as {thread, turn, status, reply, error}' },
          model: { type: 'string', help: 'sand thread start: the model of the new thread' },
          effort: { type: 'string', help: 'sand thread start: the reasoning effort of the new thread' },
          pc: { type: 'string', help: 'sand thread start: start the thread on another of your PCs, by name' },
        },
        async run(args, values) {
          const action = threadAction(args, values, ctx.cli.cwd)
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
