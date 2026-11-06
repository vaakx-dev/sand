import type { Kit } from '@sand/ui-kit/contract'
import { div, list, show } from '@vaakx-dev/vrui'
import { approvalCard } from './card'
import type { Model, Waiting } from './model'

export interface InboxParts {
  kit: Kit
  model: Model
  openThread(id: string): void
}

const where = ({ kit, openThread }: InboxParts, { decision }: Waiting, close: () => void) => {
  const line = kit.statusLine({ mark: kit.icon(decision.owner === 'bot' ? 'bot' : 'message', 'sm'), text: decision.title, title: decision.title })
  if (decision.owner === 'bot') return line
  const open = () => {
    openThread(decision.conversation)
    close()
  }
  return kit.plainButton({ class: 'flex min-w-0 rounded-md hover:text-neutral-100', title: 'Open the thread', onClick: open }, line)
}

export const inboxSheet = (parts: InboxParts, close: () => void) => {
  const { kit, model } = parts
  const { emptyState, overlay, sheet, sheetBody, sheetHead } = kit
  return overlay(
    close,
    sheet(
      { 'aria-label': 'Inbox', size: 'md' },
      sheetHead({ title: 'Inbox', close }),
      sheetBody(
        {},
        show(
          () => !model.all.get().length,
          () => emptyState({ text: 'Nothing is waiting on you.' }),
        ),
        list(
          model.all,
          item => item.decision.id,
          item =>
            div(
              { class: 'rounded-xl bg-neutral-900 p-3 ring-1 ring-neutral-700/60' },
              approvalCard(kit, model, item.get(), where(parts, item.get(), close)),
            ),
          div({ class: 'flex flex-col gap-3' }),
        ),
      ),
    ),
  )
}
