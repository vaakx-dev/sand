import type { Kit } from '@sand/ui-kit/contract'
import { input, span, type Sig } from '@vaakx-dev/vrui'
import { addDays, monthsLabel } from './days'
import type { CalendarModel, Mode } from './model'

export interface HeadParts {
  phone: Sig<boolean>
  add(): void
  subscribe(): void
  report(error: unknown): void
}

const modes: { value: Mode; label: string }[] = [
  { value: 'agenda', label: 'Agenda' },
  { value: 'week', label: 'Week' },
]

const title = (model: CalendarModel, short: boolean) => {
  const { from, to } = model.range.get()
  return model.mode.get() === 'agenda' ? monthsLabel(from, addDays(from, 1), short) : monthsLabel(from, to, short)
}

const fileInput = (model: CalendarModel, report: (error: unknown) => void) => {
  const picker: HTMLInputElement = input({
    type: 'file',
    accept: '.ics,text/calendar',
    class: 'hidden',
    onChange: () => {
      const picked = picker.files?.[0]
      picker.value = ''
      if (picked) model.importFile(picked).catch(report)
    },
  })
  return picker
}

const ownCalendar = (model: CalendarModel) => model.writable.get().find(calendar => calendar.provider === 'sand' && calendar.primary)

const viewMenu = (kit: Kit, model: CalendarModel, parts: HeadParts, picker: HTMLInputElement) => {
  const { choiceItem, dropdown, icon, menuItem, menuSeparator, navButton } = kit
  const run = (close: () => void, action: () => void) => () => {
    close()
    action()
  }
  const exportOwn = () => {
    const calendar = ownCalendar(model)
    if (calendar) model.exportFile(calendar).catch(parts.report)
  }
  const heading = () => title(model, parts.phone.get())
  return dropdown({
    class: 'flex-1',
    trigger: (press, open) =>
      navButton(
        { active: open, title: 'Views and calendar files', ...press },
        span({ class: 'min-w-0 truncate font-medium text-neutral-100' }, heading),
        span({ class: 'inline-flex shrink-0 text-neutral-500' }, icon('down', 14)),
      ),
    items: close => [
      ...modes.map(({ value, label }) =>
        choiceItem({ selected: () => model.mode.get() === value, onClick: run(close, () => model.show(value)) }, span({ class: 'flex-1' }, label)),
      ),
      menuSeparator(),
      menuItem({ onClick: run(close, () => picker.click()) }, 'Import .ics'),
      ownCalendar(model) ? menuItem({ onClick: run(close, exportOwn) }, 'Export .ics') : null,
      ownCalendar(model) ? menuItem({ onClick: run(close, parts.subscribe) }, 'Subscription link') : null,
    ],
  })
}

export const headView = (kit: Kit, model: CalendarModel, parts: HeadParts) => {
  const { icon, iconButton, quietButton } = kit
  const picker = fileInput(model, parts.report)
  return [
    viewMenu(kit, model, parts, picker),
    span(
      { class: 'flex shrink-0 items-center' },
      iconButton({ title: 'Previous week', 'aria-label': 'Previous week', onClick: model.earlier }, icon('left')),
      quietButton({ onClick: model.today }, 'Today'),
      iconButton({ title: 'Next week', 'aria-label': 'Next week', onClick: model.later }, icon('right')),
    ),
    iconButton({ title: 'New event', 'aria-label': 'New event', onClick: parts.add }, icon('plus')),
    picker,
  ]
}
