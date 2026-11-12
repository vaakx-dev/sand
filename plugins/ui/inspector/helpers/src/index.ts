import { wire } from '@sand/devices-contract'
import { inspector } from '@sand/inspector/contract'
import { kit } from '@sand/ui-kit/contract'
import { shell } from '@sand/ui-shell/contract'
import { threads, turns } from '@sand/web-client/contract'
import { definePlugin } from 'drydock'
import { commandsOf } from './commands'
import { subagentsOf } from './subagents'

export default definePlugin({
  name: 'inspector-helpers',
  description: 'The subagents and background commands of a chat: listed in its Details with the last few finished ones, each with a menu to copy or stop it, and running subagents counted above its composer',
  inject: { inspector, kit, threads, turns, wire },
  apply(ctx) {
    const subagents = subagentsOf(ctx, ctx)
    const commands = commandsOf(ctx, ctx.kit)

    ctx.effect(() => ctx.inspector.row({ id: 'helpers', group: 'helpers', order: 60, shows: subject => !subject.draft && subagents.shows(subject), render: subagents.render }))
    ctx.effect(() => ctx.inspector.row({ id: 'commands', group: 'helpers', order: 65, shows: subject => !subject.draft && commands.shows(subject), render: commands.render }))
    ctx.watch(shell, found => found?.chip(subagents.chip))
  },
})
