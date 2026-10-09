import type { TailscaleState } from '@sand/protocol'
import { div, overlay, p, place, secondaryAction, settingsRow, settingsSection, sheet, sheetHead } from '@sand/dom'
import type { Context, Dispose } from 'drydock'
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
      div(
        { class: 'flex min-h-0 flex-col gap-4 overflow-auto px-5 pt-1 pb-5' },
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
