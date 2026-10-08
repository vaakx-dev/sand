import type { PaletteItem, PalettePage, PaletteSource, WebCommand } from '@sand/protocol'
import { errorMessage } from '@sand/dom'
import type { Context } from 'drydock'

const titleOf = (command: WebCommand) => command.title ?? command.description.split(/ \(|; |, or /)[0]!

const run = (ctx: Context, command: WebCommand, args = '') =>
  void Promise.resolve(ctx.commands?.run(command.name, args)).catch(error => ctx.notify?.push(errorMessage(error), { level: 'error' }))

const argsPage = (ctx: Context, command: WebCommand): PalettePage => ({
  id: `command:${command.name}`,
  title: titleOf(command),
  field: {
    kind: 'text',
    value: '',
    placeholder: command.args,
    action: value => ({ label: 'Run', enabled: Boolean(value.trim()) }),
    submit: value => run(ctx, command, value.trim()),
  },
})

const commandItem = (ctx: Context, command: WebCommand): PaletteItem => ({
  id: `command:${command.name}`,
  group: 'Commands',
  icon: 'command',
  label: titleOf(command),
  detail: command.title ? command.description : `/${command.name}`,
  search: `/${command.name} ${command.description}`,
  ...(command.args?.startsWith('<') ? { page: () => argsPage(ctx, command) } : { run: () => run(ctx, command) }),
})

export const commandSource = (ctx: Context): PaletteSource => ({
  id: 'commands',
  order: 90,
  items: query => (query.trim() ? (ctx.commands?.list() ?? []).map(command => commandItem(ctx, command)) : []),
})
