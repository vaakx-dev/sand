import type { InstallProgress } from '@sand/host-dist/contract'
import type { HostRoute } from '@sand/host-gateway/contract'
import { updatesState, type UpdateChannel } from '@sand/host-updates/contract'
import type { Choice, Kit } from '@sand/ui-kit/contract'
import { errorMessage } from '@sand/util'
import { derive, div, dynamicChild, effect, onTimeout, show, sig, span, untrack, type Child, type Sig } from '@vaakx-dev/vrui'
import { healthDetails } from '../health/details'
import type { DevicesContext } from '../inject'
import { listenBox } from '../pair/listen'
import type { DeviceSource } from '../source'
import { installCommand, routeFor, type InstallSystem, type InstallVia } from './command'
import { installedName, progressList } from './progress'
import { installTicket } from './ticket'

const systems: Choice<InstallSystem>[] = [
  { value: 'win', label: 'Windows' },
  { value: 'mac', label: 'macOS' },
  { value: 'linux', label: 'Linux' },
]

const platforms: Record<string, InstallSystem> = { win32: 'win', darwin: 'mac', linux: 'linux' }

const viaLabels: Record<InstallVia, string> = { lan: 'Home wifi', tailscale: 'Tailscale' }

const allVias: InstallVia[] = ['lan', 'tailscale']

const viasFor = (routes: HostRoute[]) => allVias.filter(via => routeFor(routes, via))

const field = (name: string, control: Child) => div({ class: 'flex flex-wrap items-center gap-3' }, span({ class: 'text-sm text-neutral-400' }, name), control)

const agentSystem = (): InstallSystem => {
  if (/Windows/.test(navigator.userAgent)) return 'win'
  if (/Mac/.test(navigator.userAgent)) return 'mac'
  return 'linux'
}

const guess = (source: DeviceSource) => {
  const platform = untrack(() => source.pcs.get()?.self.platform)
  return (platform && platforms[platform]) || agentSystem()
}

const failedBlock = (kit: Kit, list: InstallProgress[]) => {
  const { errorText, note } = kit
  const last = list.at(-1)
  return div(
    { class: 'flex flex-col gap-3 rounded-xl bg-neutral-900 p-3' },
    errorText(last?.error ? `Install failed: ${last.error}` : `${installedName(list) ?? 'The new PC'} is not ready.`),
    last?.health ? healthDetails(kit, last.health) : null,
    note('Fix the problem and run the same command again on the new PC, or use Health → Repair in Settings → Devices.'),
  )
}

export const installStep = (ctx: DevicesContext, source: DeviceSource, ready: (list: InstallProgress[]) => void, running: Sig<boolean>) => {
  const { kit } = ctx
  const { copyButton, note, segmented } = kit
  const os = sig<InstallSystem>(guess(source))
  const via = sig<InstallVia>('lan')
  const ticket = installTicket(ctx)
  const channel = sig<UpdateChannel>('release')
  ctx.wire.call(updatesState, {}).then(
    state => channel.set(state.channel),
    () => {},
  )
  const started = derive(() => ticket.progress.get().length > 0)
  const failed = derive(() => ticket.progress.get().at(-1)?.step === 'failed')

  effect(() => {
    const busy = started.get() && !failed.get()
    untrack(() => running.set(busy))
    return () => running.set(false)
  })

  effect(() => {
    const list = ticket.progress.get()
    if (list.at(-1)?.step === 'ready') onTimeout(() => ready(list))
  })

  const vias = derive(() => {
    const routes = source.routes.get()
    return routes ? viasFor(routes).join(' ') : undefined
  })
  const chosenVia = derive(() => {
    const available = viasFor(source.routes.get() ?? [])
    return available.includes(via.get()) ? via.get() : available[0]
  })
  const route = derive(() => {
    const chosen = chosenVia.get()
    return chosen ? routeFor(source.routes.get() ?? [], chosen) : undefined
  })
  const command = derive(() => {
    const current = ticket.ticket.get()
    const target = route.get()
    return current && target ? installCommand(os.get(), target.url, current.secret, channel.get()) : undefined
  })

  const reach = (key: string | undefined) => {
    if (key === undefined) return note('Looking up the addresses of this PC…')
    if (!key) return listenBox(kit, 'sand only listens on this computer, so the new PC can’t reach it. Turn on network listening to install over your home wifi.', source.listenOnLan)
    if (!key.includes(' ')) return null
    const choices = allVias.filter(value => key.includes(value)).map(value => ({ value, label: viaLabels[value] }))
    return field('Reach this PC via', segmented(choices, chosenVia, value => via.set(value), { label: 'Reach via' }))
  }

  const pending = () => {
    const cause = ticket.error.get()
    if (cause === undefined) return 'Creating a one-time command…'
    return `Couldn't create a command: ${errorMessage(cause)}`
  }

  const commandBox = () =>
    div(
      { class: 'flex flex-col gap-2' },
      note(() => (os.get() === 'win' ? 'Open PowerShell on it and paste:' : 'Open a terminal on it and paste:')),
      div(
        { class: 'flex items-start gap-2 rounded-lg bg-neutral-950 py-2 pr-2 pl-3' },
        span(
          { class: ['min-w-0 flex-1 py-1 font-mono text-xs wrap-anywhere', () => (!command.get() && ticket.error.get() !== undefined ? 'text-danger-400' : 'text-neutral-200')] },
          () => command.get() ?? pending(),
        ),
        copyButton({ text: () => command.get() ?? '', label: 'Copy', disabled: () => !command.get() }),
      ),
    )

  return div(
    { class: 'flex flex-col gap-4' },
    show(
      () => !started.get(),
      () =>
        div(
          { class: 'flex flex-col gap-4' },
          field('The new PC runs', segmented(systems, os, value => os.set(value), { label: 'System', inset: true })),
          dynamicChild(vias, reach),
          show(() => Boolean(route.get()), commandBox),
        ),
    ),
    show(
      () => Boolean(route.get()) || started.get(),
      () => progressList(kit, ticket.progress),
    ),
    show(failed, () => dynamicChild(ticket.progress, list => failedBlock(kit, list))),
    show(
      () => !started.get() && Boolean(route.get()),
      () => note('The new PC downloads sand from GitHub, then pairs with this one. The command works for 10 minutes.'),
    ),
  )
}
