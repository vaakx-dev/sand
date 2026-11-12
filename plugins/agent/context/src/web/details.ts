import type { ContextRecord } from '@sand/chats/contract'
import type { SheetSpec } from '@sand/ui-shell/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { div } from '@vaakx-dev/vrui'
import type { ChipAction, ChipKind, ChipLink } from '../contract'

const dataDetails = ({ codeBlock, field }: Kit, record: ContextRecord) => field({ label: 'Data' }, codeBlock({}, JSON.stringify(record.data, null, 2)))

const body = (kit: Kit, kind: ChipKind, record: ContextRecord | undefined) => {
  if (!record) return kit.sheetText(`This ${kind.title.toLowerCase()} wasn’t available when the message was sent.`)
  return kind.details ? kind.details(record) : dataDetails(kit, record)
}

const actionButton = ({ primaryAction }: Kit, action: ChipAction, record: ContextRecord, close: () => void) => {
  const run = () => {
    close()
    action.run(record)
  }
  return primaryAction({ onClick: run }, action.label)
}

export const detailsSheet = (kit: Kit, kind: ChipKind, link: ChipLink, record: ContextRecord | undefined, close: () => void): SheetSpec => {
  const { icon, sheetTitle } = kit
  const { action } = kind
  return {
    label: link.label,
    size: 'sm',
    head: () => sheetTitle(link.label),
    body: () => [div({ class: 'flex items-center gap-2 text-sm text-neutral-400' }, icon(kind.icon, 'sm'), kind.title), body(kit, kind, record)],
    foot: record && action ? () => actionButton(kit, action, record, close) : undefined,
  }
}
