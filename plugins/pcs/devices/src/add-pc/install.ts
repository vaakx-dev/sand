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

const recover = 'Fix the problem and run the same command on the new PC again, or open Health on its row in Devices and click Repair.'

const failedBlock = (kit: Kit, list: InstallProgress[]) => {
  const { errorState } = kit
  const last = list.at(-1)
  const cause = last?.error ? `Install failed: ${last.error}` : `${installedName(list) ?? 'The new PC'} isn't ready.`
  return div({ class: 'flex flex-col gap-3' }, errorState({ flush: true, text: `${cause} ${recover}` }), last?.health ? healthDetails(kit, last.health) : null)
}

export const installStep = (ctx: DevicesContext, source: DeviceSource, ready: (list: InstallProgress[]) => void, running: Sig<boolean>) => {
  const { kit } = ctx
  const { codeBlock, loadingState, segmented, sheetText } = kit
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
    if (key === undefined) return loadingState({ flush: true, text: 'Looking up the addresses of this PC…' })
    if (!key) return listenBox(kit, 'sand only listens on this computer, so the new PC can’t reach it. Turn on network listening to install over your home wifi.', source.listenOnLan)
    if (!key.includes(' ')) return null
    const choices = allVias.filter(value => key.includes(value)).map(value => ({ value, label: viaLabels[value] }))
    return field('Reach this PC via', segmented(choices, chosenVia, value => via.set(value), { label: 'Reach via', inset: true }))
  }

  const pending = () => {
    const cause = ticket.error.get()
    if (cause === undefined) return 'Creating a one-time command…'
    return `Couldn't create a command: ${errorMessage(cause)}`
  }

  const commandBox = () =>
    div(
      { class: 'flex flex-col gap-2' },
      sheetText(
        () => `Paste this into ${os.get() === 'win' ? 'PowerShell' : 'a terminal'} on the new PC. It downloads sand from GitHub and pairs with this PC. The command works for 10 minutes.`,
      ),
      codeBlock({ copy: () => command.get() ?? '', danger: () => !command.get() && ticket.error.get() !== undefined }, () => command.get() ?? pending()),
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
  )
}
