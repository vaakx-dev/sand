import type { JoinRequest } from '@sand/devices-contract'
import type { SheetSpec } from '@sand/ui-shell/contract'
import { div } from '@vaakx-dev/vrui'
import { deciding } from '../requests/decide'
import { promptAfter, promptCheck, promptTitle, whereWords } from '../requests/words'
import { centered } from '../shared/parts'
import { pinCode } from '../shared/pin'
import { leftWords } from '../shared/time'
import type { Ui } from '../ui'

export const approvePrompt = (ui: Ui, request: JoinRequest, later: () => void): SheetSpec => {
  const { metaLine, primaryAction, secondaryAction, sheetText } = ui.kit
  const { busy, allow, deny } = deciding(ui, () => request, device => ui.toasts.show({ tone: 'success', title: `Allowed ${device.name}` }))
  const now = ui.data.now
  return {
    label: promptTitle(request),
    size: 'sm',
    alert: true,
    closeButton: false,
    title: promptTitle(request),
    body: () => centered(sheetText(promptCheck(request)), pinCode(request.code), sheetText(`${whereWords(request, now.get())} ${promptAfter(request)}`)),
    foot: () => [
      div({ class: 'flex min-w-0 flex-1 tabular-nums' }, metaLine(() => leftWords(request.expires, now.get()))),
      secondaryAction({ disabled: busy, onClick: deny }, 'Deny'),
      primaryAction({ disabled: busy, onClick: () => void allow() }, 'Allow'),
    ],
    onClose: later,
  }
}
