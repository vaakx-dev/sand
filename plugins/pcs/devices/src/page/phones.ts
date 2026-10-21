import type { PairedDevice } from '@sand/host-devices/contract'
import { picker, type Picker } from '@sand/picker/contract'
import { ago, oneLine } from '@sand/util'
import { clock, derive, show, type Sig } from '@vaakx-dev/vrui'
import type { DevicesContext, KitContext } from '../inject'
import type { DeviceSource } from '../source'
import { phoneMenu } from './phone-menu'

const used = (at: number) => {
  const since = ago(at)
  return since === 'now' ? 'Used just now' : `Used ${since} ago`
}

const rename = async (input: Picker, source: DeviceSource, device: PairedDevice) => {
  const name = oneLine((await input.input('Rename device', device.name)) ?? '')
  if (name && name !== device.name) await source.rename(device.id, name).catch(() => {})
}

const phoneRow = (ctx: KitContext, source: DeviceSource, device: Sig<PairedDevice>, self: string | undefined, now: Sig<number>) => {
  const { contextMenu, icon, itemRow, rowAction, secondaryAction, tile } = ctx.kit
  const { id, kind } = device.get()
  const detail = () => {
    now.get()
    return id === self ? 'This browser · removing it unpairs it' : used(device.get().lastSeen)
  }
  const menu = contextMenu()
  const input = ctx.get(picker)
  return itemRow(
    menu.target(() => phoneMenu(source, device.get(), id === self)),
    tile(icon(kind === 'phone' ? 'smartphone' : 'monitor', 16)),
    () => device.get().name,
    detail,
    input ? secondaryAction({ size: 'sm', onClick: () => void rename(input, source, device.get()) }, 'Rename…') : null,
    rowAction({ label: 'Remove', danger: true, run: () => void source.remove(id).catch(() => {}) }),
    menu.view(),
  )
}

export const phonesSection = (ctx: DevicesContext, source: DeviceSource, pair: () => void) => {
  const { hintRow, icon, rowList, secondaryAction, settingsSection } = ctx.kit
  const self = ctx.wire.pairing()?.device
  const now = clock(60_000)
  const devices = derive(() => [...(source.pcs.get()?.devices ?? [])].sort((a, b) => Number(b.id === self) - Number(a.id === self)))
  return settingsSection(
    { title: 'Phones and browsers', action: secondaryAction({ size: 'sm', onClick: pair }, icon('plus', 14), 'Add a phone') },
    rowList(devices, device => device.id, device => phoneRow(ctx, source, device, self, now)),
    show(
      devices.map(current => current.length === 0),
      () => hintRow('No phones yet'),
    ),
  )
}
