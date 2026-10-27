import type { TailscaleState } from '@sand/host-tailscale/contract'
import type { Kit } from '@sand/ui-kit/contract'
import type { KitContext } from '../inject'
import { overlaySlot } from '../overlay-slot'
import type { DeviceSource } from '../source'
import { tailscaleSection } from './tailscale'

const detail = (state: TailscaleState | undefined) => {
  if (state?.serving && state.httpsUrl) return `On · ${state.httpsUrl}`
  if (state?.running) return 'Tailscale is connected on this PC'
  return 'Works on any network with Tailscale'
}

const awaySheet = (kit: Kit, source: DeviceSource, close: () => void) => {
  const { overlay, primaryAction, sheet, sheetBody, sheetFoot, sheetHead, sheetText } = kit
  return overlay(
    close,
    sheet(
      { 'aria-label': 'Use sand away from home', size: 'md' },
      sheetHead({ title: 'Use sand away from home', close }),
      sheetBody({}, sheetText('Tailscale links your PCs and phone over any network. Install it on each one and sign in to the same Tailscale account.'), tailscaleSection(kit, source)),
      sheetFoot(primaryAction({ onClick: close }, 'Done')),
    ),
  )
}

export const awaySection = (ctx: KitContext, source: DeviceSource) => {
  const { secondaryAction, settingsRow, settingsSection } = ctx.kit
  const slot = overlaySlot(ctx)
  return settingsSection(
    {},
    settingsRow(
      { title: 'Use sand away from home', detail: () => detail(source.tailscale.get()) },
      secondaryAction({ size: 'sm', onClick: () => slot.open(() => awaySheet(ctx.kit, source, slot.close)) }, () => (source.tailscale.get()?.serving ? 'Manage' : 'Set up')),
    ),
  )
}
