import type { TailscaleState } from '@sand/host-tailscale/contract'
import { note, overlay, primaryAction, secondaryAction, settingsRow, settingsSection, sheet, sheetBody, sheetFoot, sheetHead } from '@sand/dom'
import type { Context } from 'drydock'
import { overlaySlot } from '../overlay-slot'
import type { DeviceSource } from '../source'
import { tailscaleSection } from './tailscale'

const detail = (state: TailscaleState | undefined) => {
  if (state?.serving && state.httpsUrl) return `On · ${state.httpsUrl}`
  if (state?.running) return 'Tailscale is connected on this PC'
  return 'Works on any network with Tailscale'
}

const awaySheet = (source: DeviceSource, close: () => void) =>
  overlay(
    close,
    sheet(
      { 'aria-label': 'Use sand away from home', size: 'md' },
      sheetHead({ title: 'Use sand away from home', close }),
      sheetBody({}, note('Tailscale links your PCs and phone over any network. Install it on each one and sign in to the same Tailscale account.'), tailscaleSection(source)),
      sheetFoot(primaryAction({ onClick: close }, 'Done')),
    ),
  )

export const awaySection = (ctx: Context, source: DeviceSource) => {
  const slot = overlaySlot(ctx)
  return settingsSection(
    {},
    settingsRow(
      'Use sand away from home',
      secondaryAction({ size: 'sm', onClick: () => slot.open(() => awaySheet(source, slot.close)) }, () => (source.tailscale.get()?.serving ? 'Manage' : 'Set up')),
      () => detail(source.tailscale.get()),
    ),
  )
}
