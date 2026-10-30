import type { JoinTicket, PagePairing } from '@sand/devices-contract'
import { div, span, type Child } from '@vaakx-dev/vrui'
import { command, heading, note } from '../shared/parts'
import { pinCode } from '../shared/pin'
import { qrCode } from '../shared/qr'
import { dateWords } from '../shared/time'
import type { Ui } from '../ui'
import { pasteLink } from './paste'

export interface CardParts {
  ui: Ui
  pc: () => string
  ask(): void
  asking: () => boolean
}

const titled = (parts: CardParts, title: string, ...children: Child[]) =>
  div({ class: 'flex flex-col gap-4' }, div({ class: 'flex flex-col gap-1' }, heading(title), note(parts.pc)), ...children)

const askButton = (parts: CardParts) => div(parts.ui.kit.primaryAction({ disabled: parts.asking, onClick: parts.ask }, 'Ask to join'))

export const waitingCard = (parts: CardParts, ticket: JoinTicket) => {
  const { sheetText, waitingLine } = parts.ui.kit
  const approve = ticket.approve[0]?.url
  return titled(
    parts,
    'This browser isn’t paired yet',
    div(
      { class: 'flex flex-wrap items-center gap-6' },
      div(
        { class: 'flex min-w-48 flex-1 flex-col gap-3' },
        sheetText('Tap Allow on any phone or browser that already uses sand. It will show this code:'),
        pinCode(ticket.code, 'sm'),
        waitingLine('Waiting for Allow…'),
      ),
      approve ? div({ class: 'mx-auto flex w-48 flex-col items-center gap-2 text-center' }, qrCode(approve, 'md'), note('Scan with your phone to allow this browser')) : null,
    ),
    note(() => `At ${parts.pc()} you can also run `, command(`sand devices approve ${ticket.code}`)),
    pasteLink(parts.ui),
  )
}

const removedText = (state: Extract<PagePairing, { phase: 'removed' }>) => {
  const who = state.by ?? 'Someone'
  const when = state.at ? ` on ${dateWords(state.at)}` : ''
  return `${who} removed it${when}. To use sand here again, ask to join. Someone has to tap Allow.`
}

export const removedCard = (parts: CardParts, state: Extract<PagePairing, { phase: 'removed' }>) =>
  titled(parts, 'This browser was removed', parts.ui.kit.sheetText(removedText(state)), askButton(parts), pasteLink(parts.ui))

export const expiredCard = (parts: CardParts) =>
  titled(parts, 'This link has expired', parts.ui.kit.sheetText('Links work once, within 10 minutes. Ask to join instead, and tap Allow on a paired device.'), askButton(parts))

export const wrongKindCard = (parts: CardParts) =>
  titled(parts, 'That link is for a PC', parts.ui.kit.sheetText('Links for PCs don’t pair a browser. Ask to join instead, and tap Allow on a paired device.'), askButton(parts))

export const deniedCard = (parts: CardParts) =>
  titled(parts, 'Someone tapped Deny', parts.ui.kit.sheetText('This browser wasn’t allowed. Ask again if that was a mistake.'), askButton(parts), pasteLink(parts.ui))

export const failedCard = (parts: CardParts, error: string) =>
  titled(parts, 'This browser isn’t paired yet', parts.ui.kit.errorText(error), askButton(parts), pasteLink(parts.ui))

export const busyCard = (parts: CardParts, text: string) => titled(parts, text, parts.ui.kit.waitingLine(span('One moment…')))
