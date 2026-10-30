import type { InstallGrant, InstallPlatform, PublishedRoute } from '@sand/devices-contract'
import { errorMessage } from '@sand/util'
import { derive, div, dynamicChild, effect, sig, untrack } from '@vaakx-dev/vrui'
import { copyBox, field } from '../shared/parts'
import { lifeWords } from '../shared/time'
import type { Ui } from '../ui'

type Over = 'lan' | 'tailscale'

const systems: { value: InstallPlatform; label: string }[] = [
  { value: 'win32', label: 'Windows' },
  { value: 'darwin', label: 'macOS' },
  { value: 'linux', label: 'Linux' },
]

const routeOver = (routes: PublishedRoute[], over: Over) => {
  const matching = routes.filter(route => route.kind === over)
  return matching.find(route => route.url.startsWith('https:')) ?? matching[0]
}

const commandView = (ui: Ui, grant: InstallGrant, platform: InstallPlatform) =>
  div(
    { class: 'flex flex-col gap-4' },
    field(platform === 'win32' ? 'Paste this into PowerShell on the new PC' : 'Paste this into a terminal on the new PC', copyBox(ui.kit, grant.command)),
    ui.kit.sheetText(
      `It downloads sand from GitHub and joins your PCs, no Allow needed. The command works once, for ${lifeWords(grant.expires)}, even if you close this. Progress shows in your PCs list.`,
    ),
  )

export const installStep = (ui: Ui) => {
  const { errorState, loadingState, segmented, sheetText } = ui.kit
  const { home } = ui.data
  const platform = sig<InstallPlatform | undefined>(undefined)
  const picked = sig<Over | undefined>(undefined)
  const routes = derive(() => home.network.value.get()?.routes ?? [])
  const over = derive((): Over => picked.get() ?? (routeOver(routes.get(), 'lan') ? 'lan' : 'tailscale'))
  const grant = sig<InstallGrant | undefined>(undefined)
  const error = sig('')
  const busy = sig(false)
  const name = () => ui.data.nameOf(ui.data.homeId())

  const attempts = sig(0)
  const routeUrl = derive(() => routeOver(routes.get(), over.get())?.url)

  const create = async (system: InstallPlatform, url: string) => {
    const before = untrack(() => grant.get())
    busy.set(true)
    error.set('')
    try {
      grant.set(await ui.data.installs.create(system, url))
      if (before) void ui.toasts.attempt('Couldn’t cancel the old install command', ui.data.installs.cancel(before.id))
    } catch (failure) {
      error.set(errorMessage(failure))
    } finally {
      busy.set(false)
    }
  }

  effect(() => {
    attempts.get()
    const system = platform.get()
    const url = routeUrl.get()
    if (system && url) untrack(() => void create(system, url))
  })

  return div(
    { class: 'flex flex-col gap-4' },
    field('What does the new PC run?', segmented(systems, platform, value => platform.set(value), { inset: true, label: 'System of the new PC', class: 'w-fit' })),
    field(
      () => `The new PC reaches ${name()} over`,
      dynamicChild(routes, list =>
        segmented(
          [
            { value: 'lan' as const, label: 'Home wifi', disabled: !routeOver(list, 'lan') },
            { value: 'tailscale' as const, label: 'Tailscale', disabled: !routeOver(list, 'tailscale') },
          ],
          over,
          value => picked.set(value),
          { inset: true, label: 'How the new PC reaches this one', class: 'w-fit' },
        ),
      ),
    ),
    dynamicChild(
      derive(() => ({ system: platform.get(), shown: grant.get(), failed: error.get(), waiting: busy.get(), reachable: Boolean(routeUrl.get()) })),
      ({ system, shown, failed, waiting, reachable }) => {
        if (!system) return sheetText('Pick one to get the install command.')
        if (!reachable) return errorState({ text: `Other PCs can’t reach ${name()} yet. Turn on Open to your network or Reach from anywhere first.` })
        if (failed) return errorState({ text: `Couldn’t make the install command: ${failed}`, retry: () => attempts.update(count => count + 1) })
        if (waiting || !shown) return loadingState({})
        return commandView(ui, shown, system)
      },
    ),
  )
}
