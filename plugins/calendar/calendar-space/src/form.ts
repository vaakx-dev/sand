import type { Calendar, EventDraft, EventPatch, Occurrence, Scope, When } from '@sand/calendar/contract'
import type { Kit } from '@sand/ui-kit/contract'
import type { SheetSpec } from '@sand/ui-shell/contract'
import { errorMessage } from '@sand/util'
import { derive, div, show, sig, type Sig } from '@vaakx-dev/vrui'
import { addDays, browserZone, dateInput, fromInputs, isAllDay, timeInput } from './days'

export interface Edit {
  event: Occurrence
  update(patch: EventPatch, scope: Scope): Promise<unknown>
}

export interface FormParts {
  edit?: Edit
  at?: number
  calendars: Calendar[]
  create(event: EventDraft, calendar?: string): Promise<unknown>
}

const repeatChoices = [
  { value: '', label: 'Never' },
  { value: 'FREQ=DAILY', label: 'Daily' },
  { value: 'FREQ=WEEKLY', label: 'Weekly' },
  { value: 'FREQ=MONTHLY', label: 'Monthly' },
  { value: 'FREQ=YEARLY', label: 'Yearly' },
]

const scopeChoices: { value: Scope; label: string }[] = [
  { value: 'occurrence', label: 'This event' },
  { value: 'following', label: 'This and following' },
  { value: 'series', label: 'All events' },
]

const hour = 3_600_000

interface Fields {
  title: Sig<string>
  allDay: Sig<boolean>
  startDate: Sig<string>
  startTime: Sig<string>
  endDate: Sig<string>
  endTime: Sig<string>
  repeat: Sig<string>
  location: Sig<string>
  notes: Sig<string>
}

const fieldsOf = ({ edit, at }: FormParts): Fields => {
  const event = edit?.event
  const from = event?.from ?? at ?? Math.ceil(Date.now() / hour) * hour
  const to = event?.to ?? from + hour
  const allDay = event ? isAllDay(event.start) : false
  return {
    title: sig(event?.title ?? ''),
    allDay: sig(allDay),
    startDate: sig(dateInput(from)),
    startTime: sig(timeInput(from)),
    endDate: sig(dateInput(allDay ? addDays(to, -1) : to)),
    endTime: sig(timeInput(to)),
    repeat: sig(event?.recurrence?.rule ?? ''),
    location: sig(event?.location ?? ''),
    notes: sig(event?.notes ?? ''),
  }
}

const whenOf = (fields: Fields, date: Sig<string>, time: Sig<string>, end: boolean): When => {
  if (!fields.allDay.get()) return { time: `${date.get()}T${time.get()}`, zone: browserZone() }
  return { date: end ? dateInput(addDays(fromInputs(date.get(), ''), 1)) : date.get() }
}

const timesOf = (fields: Fields) => ({
  start: whenOf(fields, fields.startDate, fields.startTime, false),
  end: whenOf(fields, fields.endDate, fields.endTime, true),
})

const draftOf = (fields: Fields): EventDraft => ({
  title: fields.title.get().trim(),
  ...timesOf(fields),
  ...(fields.repeat.get() && { recurrence: { rule: fields.repeat.get() } }),
  ...(fields.location.get().trim() && { location: fields.location.get().trim() }),
  ...(fields.notes.get().trim() && { notes: fields.notes.get().trim() }),
})

const patchOf = (fields: Fields, before: Fields): EventPatch => {
  const changed = (key: keyof Fields) => fields[key].get() !== before[key].get()
  const timing = (['allDay', 'startDate', 'startTime', 'endDate', 'endTime'] as const).some(changed)
  return {
    ...(changed('title') && { title: fields.title.get().trim() }),
    ...(timing && timesOf(fields)),
    ...(changed('repeat') && { recurrence: fields.repeat.get() ? { rule: fields.repeat.get() } : null }),
    ...(changed('location') && { location: fields.location.get().trim() }),
    ...(changed('notes') && { notes: fields.notes.get().trim() }),
  }
}

const moment = (kit: Kit, fields: Fields, date: Sig<string>, time: Sig<string>, changed: () => void = () => undefined) =>
  div(
    { class: 'flex flex-wrap items-center gap-2' },
    kit.textInput({ type: 'date', bindValue: date, class: 'w-40', 'aria-label': 'Date', onChange: changed }),
    show(
      () => !fields.allDay.get(),
      () => kit.textInput({ type: 'time', bindValue: time, class: 'w-32', 'aria-label': 'Time', onChange: changed }),
    ),
  )

const keepDuration = (fields: Fields) => {
  const startOf = () => fromInputs(fields.startDate.get(), fields.startTime.get())
  let start = startOf()
  return () => {
    const moved = startOf()
    const end = fromInputs(fields.endDate.get(), fields.endTime.get())
    if (Number.isNaN(moved) || Number.isNaN(end)) return
    const shifted = end + moved - start
    start = moved
    fields.endDate.set(dateInput(shifted))
    fields.endTime.set(timeInput(shifted))
  }
}

export const formSheet = (kit: Kit, parts: FormParts): SheetSpec => {
  const { edit } = parts
  const event = edit?.event
  const fields = fieldsOf(parts)
  const before = fieldsOf(parts)
  const calendar = sig(parts.calendars[0]?.id)
  const scope = sig<Scope>('occurrence')
  const saving = sig(false)
  const failure = sig<string | undefined>(undefined)
  const repeating = Boolean(event?.recurrence || event?.series)
  const custom = !repeatChoices.some(choice => choice.value === fields.repeat.get())
  const choices = custom ? [...repeatChoices, { value: fields.repeat.get(), label: 'Custom' }] : repeatChoices
  const valid = derive(() => Boolean(fields.title.get().trim()))
  const save = (close: () => void) => {
    if (!valid.get() || saving.get()) return
    saving.set(true)
    const done = edit ? edit.update(patchOf(fields, before), scope.get()) : parts.create(draftOf(fields), calendar.get())
    done.then(close, (error: unknown) => {
      saving.set(false)
      failure.set(errorMessage(error))
    })
  }
  return {
    label: event ? 'Edit event' : 'New event',
    title: event ? 'Edit event' : 'New event',
    body: close => [
      kit.textInput(
        {
          bindValue: fields.title,
          placeholder: 'Title',
          'aria-label': 'Title',
          onMount: node => {
            node.focus()
          },
          onKeyDown: key => {
            if (key.key === 'Enter') save(close)
          },
        },
        'md',
      ),
      kit.settingsRow({ title: 'All day' }, kit.toggleSwitch({ on: fields.allDay, 'aria-label': 'All day', onClick: () => fields.allDay.update(on => !on) })),
      kit.field({ label: 'Starts' }, moment(kit, fields, fields.startDate, fields.startTime, keepDuration(fields))),
      kit.field({ label: 'Ends' }, moment(kit, fields, fields.endDate, fields.endTime)),
      kit.field({ label: 'Repeats' }, kit.segmented(choices, fields.repeat, value => fields.repeat.set(value), { label: 'Repeats' })),
      kit.textInput({ bindValue: fields.location, placeholder: 'Location', 'aria-label': 'Location' }),
      kit.textArea({ bindValue: fields.notes, rows: 3, placeholder: 'Notes', 'aria-label': 'Notes' }),
      !event && parts.calendars.length > 1
        ? kit.field({ label: 'Calendar' }, kit.segmented(parts.calendars.map(one => ({ value: one.id, label: one.name })), calendar, value => calendar.set(value), { label: 'Calendar' }))
        : null,
      repeating ? kit.field({ label: 'Change' }, kit.segmented(scopeChoices, scope, value => scope.set(value), { label: 'Change' })) : null,
      show(
        () => Boolean(failure.get()),
        () => kit.errorText(() => failure.get() ?? ''),
      ),
    ],
    foot: close => [
      kit.quietButton({ onClick: close }, 'Cancel'),
      kit.primaryAction({ disabled: () => !valid.get() || saving.get(), onClick: () => save(close) }, 'Save'),
    ],
  }
}
