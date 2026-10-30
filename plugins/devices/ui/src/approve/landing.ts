import type { JoinRequest } from '@sand/devices-contract'
import { div, dynamicChild } from '@vaakx-dev/vrui'
import { deciding } from '../requests/decide'
import { kindIcon, viaTailscale } from '../requests/words'
import { alertDialog } from '../shared/dialog'
import { centered, heading } from '../shared/parts'
import { pinCode } from '../shared/pin'
import { leftWords } from '../shared/time'
import type { Ui } from '../ui'

const askedText = (request: JoinRequest) => {
  const over = viaTailscale(request.address) ? 'over Tailscale' : `from ${request.pcName}’s home wifi`
  return `It asked to use your PCs ${over}. Check it shows this code:`
}

const decision = (ui: Ui, request: JoinRequest, close: () => void) => {
  const { icon, primaryAction, quietButton, sheetText } = ui.kit
  const { busy, allow, deny } = deciding(ui, () => request, device => {
    ui.toasts.ok(`Allowed ${device.name}`)
    close()
  })
  return centered(
    div({ class: 'text-neutral-400' }, icon(kindIcon(request.kind, request.platform), 'lg')),
    heading(`Allow ${request.name}?`),
    sheetText(askedText(request)),
    div({ class: 'py-2' }, pinCode(request.code)),
    primaryAction({ size: 'lg', class: 'w-full', disabled: busy, onClick: () => void allow() }, 'Allow'),
    quietButton({ size: 'lg', surface: 'raised', class: 'w-full', disabled: busy, onClick: deny }, 'Deny'),
    div({ class: 'text-xs text-neutral-400 tabular-nums' }, () => leftWords(request.expires, ui.data.now.get())),
  )
}

export const approveLanding = (ui: Ui, id: string, close: () => void) => {
  const { closeButton, emptyState, errorState, loadingState, overlay, sheet, sheetBody } = ui.kit
  const { pending } = ui.data.requests
  return overlay(
    close,
    sheet(
      { ...alertDialog('Allow a new device', `approve-${id}`), size: 'sm' },
      div({ class: 'flex justify-end px-2 pt-2' }, closeButton({ surface: 'raised', onClick: close })),
      sheetBody(
        { id: `approve-${id}` },
        dynamicChild(
          () => ({ request: ui.data.requests.get(id), loaded: pending.loaded.get(), error: pending.error.get() }),
          ({ request, loaded, error }) => {
            if (request) return decision(ui, request, close)
            if (error) return errorState({ text: `Couldn’t load the request: ${error}`, retry: () => void pending.refresh() })
            if (!loaded) return loadingState({})
            return emptyState({ text: 'This request has ended. Ask the other device to try again.' })
          },
        ),
      ),
    ),
  )
}
