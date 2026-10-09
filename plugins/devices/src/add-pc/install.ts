import { copyButton, derive, div, dynamicChild, effect, p, segmented, show, sig, span, untrack, type Child, type Sig } from '@sand/dom'
import type { HostRoute, InstallProgress } from '@sand/protocol'
import type { Context } from 'drydock'
import { healthDetails } from '../health/details'
import { listenBox } from '../pair/listen'
import type { DeviceSource } from '../source'
import { installCommand, routeFor, type InstallSystem, type InstallVia } from './command'
import { installedName, progressList } from './progress'
import { installTicket } from './ticket'

const systems = [
  { value: 'win' as const, label: 'Windows' },
  { value: 'mac' as const, label: 'macOS' },
  { value: 'linux' as const, label: 'Linux' },
]

const platforms: Record<string, InstallSystem> = { win32: 'win', darwin: 'mac', linux: 'linux' }

const viaLabels: Record<InstallVia, string> = { lan: 'Home wifi', tailscale: 'Tailscale' }

const allVias: InstallVia[] = ['lan', 'tailscale']

const viasFor = (routes: HostRoute[]) => allVias.filter(via => routeFor(routes, via))

const note = (...children: Child[]) => p({ class: 'text-xs text-neutral-400' }, ...children)

const field = (name: string, control: Child) => div({ class: 'flex flex-wrap items-center gap-3' }, span({ class: 'text-sm text-neutral-400' }, name), control)

const guess = (source: DeviceSource): InstallSystem => {
  const platform = untrack(() => source.pcs.get()?.self.platform)
  if (platform && platforms[platform]) return platforms[platform]
  const agent = navigator.userAgent
  return /Windows/.test(agent) ? 'win' : /Mac/.test(agent) ? 'mac' : 'linux'
}

const listen = (source: DeviceSource) => async () => {
  try {
    await source.setLan(true)
  } catch (failure) {
    source.fail(failure)
  }
}

const failedBlock = (list: InstallProgress[]) => {
  const health = list.at(-1)?.health
  return div(
    { class: 'flex flex-col gap-3 rounded-xl bg-neutral-900 p-3' },
    p({ class: 'text-sm text-neutral-100' }, list.at(-1)?.error ? `Install failed: ${list.at(-1)!.error}` : `${installedName(list) ?? 'The new PC'} is not ready.`),
    health ? healthDetails(health) : null,
    note('Fix the problem and run the same command again on the new PC, or use Health → Repair in Settings → Your PCs.'),
  )
}

export const installStep = (ctx: Context<'wire'>, source: DeviceSource, ready: (list: InstallProgress[]) => void, running: Sig<boolean>) => {
  const os = sig<InstallSystem>(guess(source))
  const via = sig<InstallVia>('lan')
  const ticket = installTicket(ctx)
  const started = derive(() => ticket.progress.get().length > 0)
  const failed = derive(() => ticket.progress.get().at(-1)?.step === 'failed')

  effect(() => {
    const busy = started.get() && !failed.get()
    untrack(() => running.set(busy))
    return () => running.set(false)
  })

  effect(() => {
    const list = ticket.progress.get()
    if (list.at(-1)?.step === 'ready') untrack(() => queueMicrotask(() => ready(list)))
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
    return current && target ? installCommand(os.get(), target.url, current.secret) : undefined
  })

  const reach = (key: string | undefined) => {
    if (key === undefined) return note('Looking up the addresses of this PC…')
    if (!key) return listenBox('sand only listens on this computer, so the new PC can’t reach it. Turn on network listening to install over your home wifi.', listen(source))
    if (!key.includes(' ')) return span({ class: 'hidden' })
    const choices = key.split(' ').map(value => ({ value: value as InstallVia, label: viaLabels[value as InstallVia] }))
    return field('Reach this PC via', segmented(choices, chosenVia, value => via.set(value), { label: 'Reach via' }))
  }

  const commandBox = () =>
    div(
      { class: 'flex flex-col gap-2' },
      note(() => (os.get() === 'win' ? 'Open PowerShell on it and paste:' : 'Open a terminal on it and paste:')),
      div(
        { class: 'flex items-start gap-2 rounded-lg bg-neutral-950 py-2 pr-2 pl-3' },
        span({ class: 'min-w-0 flex-1 py-1 font-mono text-xs text-neutral-200 wrap-anywhere' }, () => command.get() ?? 'Creating a one-time command…'),
        copyButton({ text: () => command.get() ?? '', label: 'Copy', disabled: () => !command.get() }),
      ),
    )

  return div(
    { class: 'flex flex-col gap-4' },
    show(
      derive(() => !started.get()),
      () =>
        div(
          { class: 'flex flex-col gap-4' },
          field('The new PC runs', segmented(systems, os, value => os.set(value), { label: 'System', inset: true })),
          dynamicChild(vias, reach),
          show(
            derive(() => Boolean(route.get())),
            commandBox,
          ),
        ),
    ),
    show(
      derive(() => Boolean(route.get()) || started.get()),
      () => progressList(ticket.progress),
    ),
    show(failed, () => dynamicChild(ticket.progress, failedBlock)),
    show(
      derive(() => !started.get() && Boolean(route.get())),
      () => note('Works for 10 minutes.'),
    ),
  )
}
