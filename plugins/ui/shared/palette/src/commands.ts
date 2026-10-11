import type { WebCommand } from '@sand/commands/contract'
import type { PaletteItem, PalettePage, PaletteSource } from './contract'
import type { Context } from 'drydock'
import { reportFailure } from './failure'

const titleOf = (command: WebCommand) => command.title ?? command.description.split(/ \(|; |, or /)[0]!

const runCommand = async (ctx: Context, command: WebCommand, args = '') => {
  await ctx.commands?.run(command.name, args)
}

const argsPage = (ctx: Context, command: WebCommand): PalettePage => ({
  id: `command:${command.name}`,
  title: titleOf(command),
  field: {
    kind: 'text',
    value: '',
    placeholder: command.args,
    action: value => ({ label: 'Run', enabled: Boolean(value.trim()) }),
    submit: value => void runCommand(ctx, command, value.trim()).catch(error => reportFailure(ctx, error)),
  },
})

const commandItem = (ctx: Context, command: WebCommand): PaletteItem => ({
  id: `command:${command.name}`,
  group: 'Commands',
  icon: 'command',
  label: titleOf(command),
  detail: command.title ? command.description : `/${command.name}`,
  search: `/${command.name} ${command.description}`,
  ...(command.args?.startsWith('<') ? { page: () => argsPage(ctx, command) } : { run: () => runCommand(ctx, command) }),
})

export const commandSource = (ctx: Context): PaletteSource => ({
  id: 'commands',
  order: 90,
  items: query => (query.trim() ? (ctx.commands?.list() ?? []).map(command => commandItem(ctx, command)) : []),
})
