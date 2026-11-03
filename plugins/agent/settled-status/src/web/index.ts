import { pcHello, pcs, wire } from '@sand/devices-contract'
import { sidebar } from '@sand/sidebar/contract'
import { sig, span } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { helloSettledStatus, settledStatusChange, type StatusChange } from '../contract'

type Statuses = Readonly<Record<string, string>>

const changed = (statuses: Statuses, { session, text }: StatusChange): Statuses => {
  const { [session]: _, ...rest } = statuses
  return text === null ? rest : { ...rest, [session]: text }
}

export default definePlugin({
  name: 'settled-status-web',
  description: "Shows each settled thread's status line in place of the branch on its sidebar row",
  inject: { wire, pcs },
  apply(ctx) {
    const devices = sig<ReadonlyMap<string, Statuses>>(new Map())
    const edit = (device: string, change: (statuses: Statuses) => Statuses) =>
      devices.update(current => new Map(current).set(device, change(current.get(device) ?? {})))
    const hello = (device: string) => edit(device, () => ctx.wire.hello(helloSettledStatus, device) ?? {})

    ctx.on(pcHello, hello)
    for (const pc of ctx.pcs.list()) if (ctx.wire.ready(pc.id)) hello(pc.id)
    ctx.effect(() => ctx.wire.on(settledStatusChange, (change, device) => edit(device, statuses => changed(statuses, change)), { from: 'all' }))
    ctx.watch(sidebar, found =>
      found?.decorate({
        id: 'settled-status',
        order: 10,
        meta(thread) {
          const text = devices.get().get(thread.device)?.[thread.id]
          return text ? span({ class: 'truncate text-neutral-500', title: text }, text) : null
        },
      }),
    )
  },
})
