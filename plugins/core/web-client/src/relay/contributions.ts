import type { RelayContributions } from '@sand/server/contract'
import type { Models, Threads, Wire } from '../contract'
import type { Context, Dispose, Services } from 'drydock'

const empty: RelayContributions = { commands: [] }

export const relayContributions = (ctx: Context, wire: Wire, threads: Threads, models: Models) => {
  let contributions = empty
  let resync: (() => void) | undefined

  const target = () => {
    const session = threads.current()?.id
    return { session, cwd: threads.cwd(), ...(!session && { settings: models.draft() }) }
  }

  const register = (commands: Services['commands']) =>
    contributions.commands.map(({ name, title, description, args }) =>
      commands.add({
        name,
        title,
        description,
        args,
        source: 'server',
        run: async input => void (await wire.call({ type: 'ui.command', name, args: input, ...target() })),
      }),
    )

  ctx.watch('commands', commands => {
    if (!commands) return
    let added: Dispose[] = []
    const clear = () => {
      for (const dispose of added) void dispose()
      added = []
    }
    resync = () => {
      clear()
      added = register(commands)
    }
    resync()
    return () => {
      resync = undefined
      clear()
    }
  })

  return (next: RelayContributions = empty) => {
    contributions = next
    resync?.()
  }
}
