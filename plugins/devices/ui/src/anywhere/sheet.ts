import { pairHandoff } from '@sand/devices-contract'
import { errorMessage } from '@sand/util'
import { dynamicChild, sig } from '@vaakx-dev/vrui'
import type { Ui } from '../ui'

const tailscaleApp = 'https://tailscale.com/download'

export const anywhereSheet = (ui: Ui, close: () => void) => {
  const { errorText, icon, openTab, overlay, primaryAction, secondaryAction, sheet, sheetBody, sheetFoot, sheetHead, sheetText } = ui.kit
  const busy = sig(false)
  const error = sig('')
  const home = () => ui.data.nameOf(ui.data.homeId())

  const go = async () => {
    busy.set(true)
    error.set('')
    try {
      const link = await ui.ctx.wire.call(pairHandoff, {})
      const away = link.links.find(share => share.route.kind === 'tailscale' && share.url.startsWith('https:'))
      if (!away) throw new Error(`${home()} has no secure Tailscale address yet. Turn on Reach from anywhere first`)
      location.assign(away.url)
    } catch (failure) {
      error.set(`Couldn’t set it up: ${errorMessage(failure)}`)
      busy.set(false)
    }
  }

  return overlay(
    close,
    sheet(
      { 'aria-label': 'Use this phone from anywhere', size: 'sm' },
      sheetHead({ title: 'Use this phone from anywhere', close }),
      sheetBody(
        {},
        sheetText('sand opens its secure Tailscale address and keeps this phone paired there too.'),
        sheetText(() => `This phone needs the Tailscale app, signed in to the same account as ${home()}.`),
        secondaryAction({ class: 'w-fit', onClick: () => openTab(tailscaleApp) }, 'Get Tailscale', icon('external', 'sm')),
        dynamicChild(error, text => (text ? errorText(text) : null)),
      ),
      sheetFoot(secondaryAction({ onClick: close }, 'Not now'), primaryAction({ disabled: busy, onClick: () => void go() }, 'Continue')),
    ),
  )
}
