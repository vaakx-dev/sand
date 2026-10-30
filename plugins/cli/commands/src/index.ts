import { cli } from '@sand/config/contract'
import { definePlugin } from 'drydock'
import { cliCommands } from './contract'
import { helpText } from './help'
import { commandRegistry } from './registry'
import { runCommand } from './run'

export default definePlugin({
  name: 'cli-commands',
  description: 'Runs the sand command you typed once every plugin has started, and the sand help command',
  inject: { cli },
  apply(ctx) {
    const commands = commandRegistry()
    ctx.provide(cliCommands, commands)
    ctx.effect(() =>
      commands.register({
        name: 'help',
        summary: 'show this help',
        run: () => console.log(helpText(commands.list())),
      }),
    )
    const run = async () => {
      const awake = setInterval(() => {}, 60_000)
      try {
        await ctx.settled()
        return await runCommand(commands, ctx.cli.args)
      } finally {
        clearInterval(awake)
      }
    }
    const start = async () => ctx.cli.exit(await run())
    void start()
  },
})
