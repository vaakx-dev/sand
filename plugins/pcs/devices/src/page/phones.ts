import type { PairedDevice } from '@sand/host-devices/contract'
import { ago, clock, contextMenu, derive, div, hintRow, icon, rowAction, rowList, secondaryAction, settingsRow, settingsSection, show, span, tile, type Sig } from '@sand/dom'
import { oneLine } from '@sand/kit'
import type { Context } from 'drydock'
import type { DeviceSource } from '../source'
import { phoneMenu } from './phone-menu'

const used = (at: number) => {
  const since = ago(at)
  return since === 'now' ? 'Used just now' : `Used ${since} ago`
}

const rename = async (ctx: Context, source: DeviceSource, device: PairedDevice) => {
  const name = oneLine((await ctx.picker?.input('Rename device', device.name)) ?? '')
  if (name && name !== device.name) await source.rename(device.id, name).catch(source.fail)
}

const phoneRow = (ctx: Context, source: DeviceSource, device: Sig<PairedDevice>, self: string | undefined, now: Sig<number>) => {
  const { id, kind } = device.get()
  const label = span(
    { class: 'flex min-w-0 items-center gap-2' },
    tile(icon(kind === 'phone' ? 'smartphone' : 'monitor', 16)),
    span({ class: 'truncate' }, () => device.get().name),
  )
  const detail = () => {
    now.get()
    return id === self ? 'This browser · removing it unpairs it' : used(device.get().lastSeen)
  }
  const actions = div(
    { class: 'flex shrink-0 items-center gap-2' },
    ctx.picker ? rowAction({ label: 'Rename', run: () => void rename(ctx, source, device.get()) }) : null,
    rowAction({ label: 'Remove', danger: true, run: () => void source.remove(id).catch(source.fail) }),
  )
  const menu = contextMenu()
  return div(
    { class: 'flex flex-col', ...menu.target(() => phoneMenu(source, device.get(), id === self)) },
    menu.view(),
    settingsRow(label, actions, detail),
  )
}

export const phonesSection = (ctx: Context<'wire'>, source: DeviceSource, pair: () => void) => {
  const self = ctx.wire.pairing()?.device
  const now = clock(60_000)
  const devices = derive(() => [...(source.pcs.get()?.devices ?? [])].sort((a, b) => Number(b.id === self) - Number(a.id === self)))
  return settingsSection(
    { title: 'Phones and browsers', action: secondaryAction({ size: 'sm', onClick: pair }, 'Add a phone') },
    rowList(devices, device => device.id, device => phoneRow(ctx, source, device, self, now)),
    show(
      devices.map(current => current.length === 0),
      () => hintRow('None yet.'),
    ),
  )
}
