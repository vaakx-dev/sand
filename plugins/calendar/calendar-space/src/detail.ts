import { type Answer, type Attendee, type Calendar, type Occurrence, type Person, type Response, type Scope } from '@sand/calendar/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { div, dynamicChild, p, sig, span, type Child } from '@vaakx-dev/vrui'
import { spanLabel } from './days'

export interface DetailParts {
  event: Occurrence
  calendar?: Calendar
  close(): void
  edit(): void
  remove(scope: Scope): Promise<unknown>
  respond(response: Answer): Promise<unknown>
}

const repeats: Record<string, string> = { DAILY: 'Repeats daily', WEEKLY: 'Repeats weekly', MONTHLY: 'Repeats monthly', YEARLY: 'Repeats yearly' }

const repeatText = (rule: string) => repeats[/FREQ=(\w+)/.exec(rule)?.[1] ?? ''] ?? 'Repeats'

const said: Record<Response, string> = { 'needs-action': 'not answered', accepted: 'going', declined: 'not going', tentative: 'maybe' }

const answerLabels: Record<Answer, string> = { accepted: 'Going', tentative: 'Maybe', declined: 'Not going' }

const order: Answer[] = ['accepted', 'tentative', 'declined']

const line = (kit: Kit, glyph: string, ...text: Child[]) => div({ class: 'flex items-start gap-3 text-sm text-neutral-100' }, span({ class: 'mt-1 text-neutral-400' }, kit.icon(glyph, 'sm')), div({ class: 'min-w-0 flex-1' }, ...text))

const person = (who: Person, note: string) => div({ class: 'truncate' }, who.name ?? who.email, span({ class: 'text-neutral-400' }, ` · ${note}`))

const people = ({ organizer, attendees = [] }: Occurrence) => [
  ...(organizer ? [person(organizer, 'organizer')] : []),
  ...attendees.filter(guest => guest.email !== organizer?.email).map((guest: Attendee) => person(guest, said[guest.response])),
]

const answering = (kit: Kit, { event, respond }: DetailParts) => {
  const chosen = sig(event.response === 'needs-action' ? undefined : event.response)
  const choose = (response: Answer) => {
    chosen.set(response)
    void respond(response)
  }
  return div(
    { class: 'flex flex-col gap-2' },
    span({ class: 'text-sm text-neutral-400' }, 'Going?'),
    kit.segmented(
      order.map(value => ({ value, label: answerLabels[value] })),
      chosen,
      choose,
      { label: 'Your answer', fill: true },
    ),
  )
}

const scopes: { value: Scope; label: string }[] = [
  { value: 'occurrence', label: 'This event' },
  { value: 'following', label: 'This and following' },
  { value: 'series', label: 'All events' },
]

const removal = (kit: Kit, { event, remove, close }: DetailParts) => {
  const asking = sig(false)
  const run = (scope: Scope) => () => void remove(scope).then(close)
  const danger = (scope: Scope, label: string) => kit.controlButton(kit.actionTones.danger, { size: 'sm', onClick: run(scope) }, label)
  const repeating = Boolean(event.recurrence || event.series)
  return dynamicChild(asking, ask =>
    ask
      ? div(
          { class: 'flex flex-wrap items-center justify-end gap-2' },
          kit.secondaryAction({ size: 'sm', onClick: () => asking.set(false) }, 'Cancel'),
          ...(repeating ? scopes.map(scope => danger(scope.value, scope.label)) : [danger('occurrence', 'Delete')]),
        )
      : kit.secondaryAction({ size: 'sm', onClick: () => asking.set(true) }, 'Delete'),
  )
}

export const detailSheet = (kit: Kit, parts: DetailParts) => {
  const { event, calendar, close, edit } = parts
  const writable = calendar?.capabilities.includes('write') ?? false
  const invited = event.response !== undefined
  const guests = people(event)
  return kit.overlay(
    close,
    kit.sheet(
      { size: 'sm', 'aria-label': event.title },
      kit.sheetHead({
        title: event.title,
        close,
        actions: writable ? kit.iconButton({ title: 'Edit', 'aria-label': 'Edit', surface: 'raised', onClick: edit }, kit.icon('pencil')) : null,
      }),
      kit.sheetBody(
        {},
        line(kit, 'clock', spanLabel(event), event.recurrence ? p({ class: 'text-neutral-400' }, repeatText(event.recurrence.rule)) : null),
        event.location ? line(kit, 'pin', event.location) : null,
        calendar ? line(kit, 'calendar', calendar.name) : null,
        guests.length ? line(kit, 'users', ...guests) : null,
        event.notes ? p({ class: 'whitespace-pre-wrap text-sm text-neutral-400' }, event.notes) : null,
        invited && writable ? answering(kit, parts) : null,
      ),
      writable ? kit.sheetFoot(removal(kit, parts)) : null,
    ),
  )
}
