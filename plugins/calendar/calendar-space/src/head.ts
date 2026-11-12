import type { Kit } from '@sand/ui-kit/contract'
import { input, span } from '@vaakx-dev/vrui'
import { addDays, monthsLabel } from './days'
import type { CalendarModel, Mode } from './model'

export interface HeadParts {
  phone(): boolean
  add(): void
  subscribe(): void
  report(error: unknown): void
}

const modes: { value: Mode; label: string; narrow: string }[] = [
  { value: 'agenda', label: 'Agenda', narrow: 'Agenda' },
  { value: 'week', label: 'Week', narrow: '3 days' },
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
  const { choiceItem, dropdown, menuItem, menuSeparator } = kit
  const run = (close: () => void, action: () => void) => () => {
    close()
    action()
  }
  const exportOwn = () => {
    const calendar = ownCalendar(model)
    if (calendar) model.exportFile(calendar).catch(parts.report)
  }
  const heading = () => title(model, parts.phone())
  return dropdown({
    class: 'flex-1',
    trigger: press =>
      kit.titleButton({ title: 'Views and calendar files', ...press }, heading),
    items: close => [
      ...modes.map(({ value, label, narrow }) =>
        choiceItem({ selected: () => model.mode.get() === value, onClick: run(close, () => model.show(value)) }, span({ class: 'flex-1' }, model.narrow.get() ? narrow : label)),
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
      iconButton({ title: 'Earlier', 'aria-label': 'Earlier', onClick: model.earlier }, icon('left')),
      quietButton({ onClick: model.today }, 'Today'),
      iconButton({ title: 'Later', 'aria-label': 'Later', onClick: model.later }, icon('right')),
    ),
    iconButton({ title: 'New event', 'aria-label': 'New event', onClick: parts.add }, icon('plus')),
    picker,
  ]
}
