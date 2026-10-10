import type { Commands, WebCommand } from './contract'
import { definePlugin } from 'drydock'

export default definePlugin({
  name: 'commands',
  description: 'Command host: merges local commands with the server commands relayed to the page',
  apply(ctx) {
    let entries: WebCommand[] = []
    let queued = false

    const emitChange = () => {
      queued = false
      ctx.emit('commands.change')
    }

    const changed = () => {
      if (queued) return
      queued = true
      void Promise.resolve().then(emitChange)
    }

    const get = (name: string) => {
      const named = entries.filter(command => command.name === name)
      return named.findLast(command => command.source !== 'server') ?? named.at(-1)
    }

    const commands: Commands = {
      add(command) {
        entries = [...entries, command]
        changed()
        return () => {
          entries = entries.filter(candidate => candidate !== command)
          changed()
        }
      },
      list: () =>
        [...new Set(entries.map(command => command.name))]
          .sort((a, b) => a.localeCompare(b))
          .flatMap(name => get(name) ?? []),
      get,
      async run(name, args = '') {
        const command = get(name)
        if (!command) return false
        await command.run(args)
        return true
      },
    }

    ctx.provide('commands', commands)
  },
})
