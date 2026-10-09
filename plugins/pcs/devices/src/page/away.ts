import type { TailscaleState } from '@sand/host-tailscale/contract'
import { overlay, p, place, secondaryAction, settingsRow, settingsSection, sheet, sheetHead } from '@sand/dom'
import type { Context, Dispose } from 'drydock'
import { sheetBody } from '../components'
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
      { 'aria-label': 'Use sand away from home', class: 'max-w-lg' },
      sheetHead('Use sand away from home', close),
      sheetBody(
        p({ class: 'text-xs text-neutral-400' }, 'Tailscale links your PCs and phone over any network. Install it on each one and sign in to the same Tailscale account.'),
        tailscaleSection(source),
      ),
    ),
  )

export const awaySection = (ctx: Context, source: DeviceSource) => {
  let unplace: Dispose | undefined
  const close = () => {
    void unplace?.()
    unplace = undefined
  }
  const open = () => {
    close()
    unplace = place(ctx, 'overlay', () => awaySheet(source, close), 100)
  }
  return settingsSection(
    {},
    settingsRow(
      'Use sand away from home',
      secondaryAction({ size: 'sm', onClick: open }, () => (source.tailscale.get()?.serving ? 'Manage' : 'Set up')),
      () => detail(source.tailscale.get()),
    ),
  )
}
