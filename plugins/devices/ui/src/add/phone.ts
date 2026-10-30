import { type PairLink, pairJoined } from '@sand/devices-contract'
import { derive, div, dynamicChild, effect, sig, span } from '@vaakx-dev/vrui'
import { centered, copyBox, note } from '../shared/parts'
import { qrCode } from '../shared/qr'
import type { Ui } from '../ui'
import type { AddDone } from './done'
import { livePairLink } from './pair-link'

type Reach = 'anywhere' | 'home'

const urlFor = (link: PairLink | undefined, reach: Reach) =>
  link?.links.find(share => (reach === 'anywhere' ? share.route.kind === 'tailscale' && share.url.startsWith('https:') : share.route.kind === 'lan'))?.url

const minutesLeft = (link: PairLink) => Math.max(1, Math.round((link.expires - Date.now()) / 60_000))

const reachNote = (reach: Reach) =>
  reach === 'anywhere' ? 'The phone needs Tailscale, signed in to your account.' : 'The phone can only use sand while it’s on your home wifi.'

const turnOnCallout = (ui: Ui) => {
  const { callout, secondaryAction } = ui.kit
  const busy = sig(false)
  const turnOn = async () => {
    busy.set(true)
    await ui.toasts.attempt('Couldn’t turn on Reach from anywhere', ui.data.home.setHttps(true))
    busy.set(false)
  }
  return callout(
    { tone: 'neutral', icon: 'info' },
    span({ class: 'min-w-0 flex-1' }, 'To use it anywhere, turn on Reach from anywhere first.'),
    secondaryAction({ size: 'sm', disabled: busy, onClick: () => void turnOn() }, 'Turn on'),
  )
}

const linkView = (ui: Ui, link: PairLink, reach: Reach, url: string) =>
  div(
    { class: 'flex flex-col gap-4' },
    centered(qrCode(url), ui.kit.sheetText('Scan with the phone’s camera, or open the link on it.')),
    copyBox(ui.kit, url),
    div({ class: 'flex flex-col gap-1' }, ui.kit.waitingLine('Waiting for a device…'), note(`Works once, within ${minutesLeft(link)} minutes. ${reachNote(reach)}`)),
  )

export const phoneStep = (ui: Ui, done: (result: AddDone) => void) => {
  const { errorState, segmented } = ui.kit
  const live = livePairLink(ui, 'device')
  const picked = sig<Reach | undefined>(undefined)
  const reach = derive((): Reach => picked.get() ?? (urlFor(live.link.get(), 'anywhere') ? 'anywhere' : 'home'))
  const url = derive(() => urlFor(live.link.get(), reach.get()))

  effect(() =>
    ui.ctx.wire.on(pairJoined, ({ token, device }) => {
      if (token !== live.link.get()?.token) return
      live.used()
      const away = reach.get() === 'anywhere'
      done({ title: `${device.name} joined`, text: `${device.name} can use all your PCs, ${away ? 'at home and away' : 'while it’s on your home wifi'}.`, again: true })
    }),
  )

  return div(
    { class: 'flex flex-col gap-4' },
    dynamicChild(live.link, link =>
      segmented(
        [
          { value: 'anywhere' as const, label: 'Anywhere (Tailscale)', disabled: !urlFor(link, 'anywhere') },
          { value: 'home' as const, label: 'Home wifi only', disabled: !urlFor(link, 'home') },
        ],
        reach,
        value => picked.set(value),
        { inset: true, fill: true, label: 'Where the phone can use sand' },
      ),
    ),
    dynamicChild(
      derive(() => Boolean(live.link.get()) && !urlFor(live.link.get(), 'anywhere')),
      off => (off ? turnOnCallout(ui) : null),
    ),
    dynamicChild(
      derive(() => ({ link: live.link.get(), url: url.get(), error: live.error.get(), reach: reach.get() })),
      ({ link, url: shown, error, reach: chosen }) => {
        if (error) return errorState({ text: `Couldn’t make a pairing link: ${error}`, retry: live.retry })
        if (!link) return ui.kit.loadingState({})
        if (!shown) return errorState({ text: 'Phones can’t reach this PC yet. Turn on Open to your network on the Devices page.' })
        return linkView(ui, link, chosen, shown)
      },
    ),
  )
}
