import type { Message } from '@sand/composer/contract'
import type { Pulse } from '@sand/reactive'
import type { Kit } from '@sand/ui-kit/contract'
import type { SheetSpec } from '@sand/ui-shell/contract'
import type { Shared } from '@sand/web/contract'
import { div, show, sig, span, untrack, type Child } from '@vaakx-dev/vrui'
import type { ShareContext } from '../context'
import { newThreadPlace, recentPlaces, type Place, type Recent } from '../places'
import { previews } from './preview'

interface SheetParts {
  ctx: ShareContext
  changes: Pulse
  shared: Shared
}

const LEAD_SIZE = '26px'

const leadBox = (lead: Child) => span({ class: 'inline-flex items-center justify-center', style: { width: LEAD_SIZE, height: LEAD_SIZE } }, lead)

const placeRow = (kit: Kit, place: Place, trail: Child, choose: (place: Place) => void) =>
  kit.listRow({ touch: true, title: place.label, meta: place.meta, lead: leadBox(place.lead()), trail, onClick: () => choose(place) })

const rowKey = ({ id, label, meta, at }: Recent) => [id, label, meta, at].join('\u0000')

const messageOf = (note: string, { text, files }: Shared): Message => ({
  text: [note, text]
    .map(part => part.trim())
    .filter(Boolean)
    .join('\n\n'),
  items: files,
})

const shareSheet = ({ ctx, changes, shared }: SheetParts): SheetSpec => {
  const { kit } = ctx
  const note = sig('')
  const query = sig('')
  const shown = changes.read(() => recentPlaces(ctx, query.get()))
  const emptyText = () => (query.get().trim() ? 'Nothing matches.' : 'No threads or bots yet.')

  const body = (close: () => void) => {
    const choose = (place: Place) => {
      ctx.composer.send(place.open(), messageOf(note.get(), shared))
      close()
    }
    return div(
      { class: 'flex flex-col gap-3' },
      ...previews(kit, shared),
      kit.textInput({ placeholder: 'Add a message (optional)', 'aria-label': 'Add a message', bindValue: note }),
      kit.searchField({ placeholder: 'Search bots and threads', 'aria-label': 'Search bots and threads', bindValue: query }),
      div(
        { class: '-mx-2 flex flex-col' },
        placeRow(kit, newThreadPlace(ctx), null, choose),
        kit.groupHeading('Recent'),
        kit.rowList(shown, rowKey, place => {
          const found = untrack(() => place.get())
          return placeRow(kit, found, kit.age(found.at), choose)
        }),
        show(
          () => !shown.get().length,
          () => div({ class: 'px-2' }, kit.emptyState({ text: emptyText })),
        ),
      ),
    )
  }

  return { label: 'Send to sand', title: 'Send to sand', body }
}

export { shareSheet }
