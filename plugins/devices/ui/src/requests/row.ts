import type { DeviceRecord, JoinRequest } from '@sand/devices-contract'
import { span, type Sig } from '@vaakx-dev/vrui'
import { leftWords } from '../shared/time'
import type { Ui } from '../ui'
import { deciding } from './decide'
import { askedWords, kindIcon } from './words'

export interface RequestRowOptions {
  compact?: boolean
  allowed?(device: DeviceRecord): void
}

const detail = (ui: Ui, request: Sig<JoinRequest>, compact: boolean) => {
  const code = span({ class: 'font-mono' }, () => request.get().code)
  const asked = () => askedWords(request.get(), ui.data.now.get())
  if (request.get().kind === 'pc') return [() => (compact ? 'Wants to join your PCs · code ' : `${asked()} · code `), code]
  return ['Code ', code, () => ` · ${compact ? leftWords(request.get().expires, ui.data.now.get()) : asked().replace(/^A/, 'a')}`]
}

export const requestRow = (ui: Ui, request: Sig<JoinRequest>, { compact = false, allowed }: RequestRowOptions = {}) => {
  const { closeButton, icon, primaryAction, secondaryAction, settingsRow } = ui.kit
  const { busy, allow, deny } = deciding(ui, () => request.get(), allowed)
  const denyButton = compact
    ? closeButton({ title: 'Deny', size: 'sm', surface: 'group', disabled: busy, onClick: deny })
    : secondaryAction({ size: 'sm', disabled: busy, onClick: deny }, 'Deny')
  return settingsRow(
    {
      lead: span({ class: 'inline-flex text-neutral-400' }, icon(kindIcon(request.get().kind, request.get().platform), 'md')),
      title: () => request.get().name,
      detail: detail(ui, request, compact),
    },
    denyButton,
    primaryAction({ size: 'sm', disabled: busy, onClick: () => void allow() }, 'Allow'),
  )
}
