import type { RelayContributions, Threads, Wire } from '@sand/protocol'
import type { Context, Dispose, ServiceKey, Services } from 'drydock'

const empty: RelayContributions = { commands: [] }

export const relayContributions = (ctx: Context, wire: Wire, threads: Threads) => {
  let contributions = empty
  const syncs = new Set<() => void>()
  const target = () => {
    const session = threads.current()?.id
    return { session, cwd: threads.cwd(), ...(!session && { settings: ctx.models?.draft() }) }
  }

  const follow = <K extends ServiceKey>(key: K, register: (impl: Services[K]) => Dispose[]) =>
    ctx.watch(key, impl => {
      if (!impl) return
      let current: Dispose[] = []
      const clear = () => {
        for (const dispose of current) void dispose()
        current = []
      }
      const sync = () => {
        clear()
        current = register(impl)
      }
      sync()
      syncs.add(sync)
      return () => {
        syncs.delete(sync)
        clear()
      }
    })

  follow('commands', commands =>
    contributions.commands.map(({ name, title, description, args }) =>
      commands.add({
        name,
        title,
        description,
        args,
        source: 'server',
        run: async input => void (await wire.call({ type: 'ui.command', name, args: input, ...target() })),
      }),
    ),
  )

  const advertise = (next: RelayContributions) => {
    contributions = next
    for (const sync of [...syncs]) sync()
  }

  return {
    reset: (next = empty) => advertise(next),
    advertise,
  }
}
