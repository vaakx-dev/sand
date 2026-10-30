import type { JoinRequest } from '@sand/devices-contract'
import { div, span } from '@vaakx-dev/vrui'
import { deciding } from '../requests/decide'
import { promptAfter, promptCheck, promptTitle, whereWords } from '../requests/words'
import { alertDialog } from '../shared/dialog'
import { centered, note } from '../shared/parts'
import { pinCode } from '../shared/pin'
import { leftWords } from '../shared/time'
import type { Ui } from '../ui'

export const approvePrompt = (ui: Ui, request: JoinRequest, later: () => void) => {
  const { overlay, primaryAction, secondaryAction, sheet, sheetBody, sheetFoot, sheetHead, sheetText } = ui.kit
  const { busy, allow, deny } = deciding(ui, () => request, device => ui.toasts.ok(`Allowed ${device.name}`))
  const now = ui.data.now
  const described = `approve-${request.id}`
  return overlay(
    later,
    sheet(
      { ...alertDialog(promptTitle(request), described), size: 'sm' },
      sheetHead({ title: promptTitle(request) }),
      sheetBody(
        { id: described },
        centered(sheetText(promptCheck(request)), pinCode(request.code)),
        div({ class: 'text-center' }, note(`${whereWords(request, now.get())} ${promptAfter(request)}`)),
      ),
      sheetFoot(
        span({ class: 'flex-1 text-xs text-neutral-400 tabular-nums' }, () => leftWords(request.expires, now.get())),
        secondaryAction({ disabled: busy, onClick: deny }, 'Deny'),
        primaryAction({ disabled: busy, onClick: () => void allow() }, 'Allow'),
      ),
    ),
  )
}
