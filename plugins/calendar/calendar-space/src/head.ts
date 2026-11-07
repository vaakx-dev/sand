import type { Kit } from '@sand/ui-kit/contract'
import { dynamicChild, input, type Sig } from '@vaakx-dev/vrui'
import { monthLabel, rangeLabel, shortMonthLabel } from './days'
import type { CalendarModel, Mode } from './model'

export interface HeadParts {
  narrow: Sig<boolean>
  add(): void
  subscribe(): void
  report(error: unknown): void
}

const modes = [
  { value: 'agenda' as Mode, label: 'Agenda' },
  { value: 'week' as Mode, label: 'Week' },
]

const title = (model: CalendarModel, narrow: boolean) => {
  const { from, to } = model.range.get()
  if (narrow) return shortMonthLabel(from)
  return model.mode.get() === 'agenda' ? monthLabel(from) : rangeLabel(from, to)
}

const other: Record<Mode, { mode: Mode; label: string; icon: string }> = {
  agenda: { mode: 'week', label: 'Show the week', icon: 'calendar' },
  week: { mode: 'agenda', label: 'Show the agenda', icon: 'menu' },
}

const modeToggle = (kit: Kit, model: CalendarModel) =>
  dynamicChild(model.mode, mode => {
    const next = other[mode]
    return kit.iconButton({ title: next.label, 'aria-label': next.label, onClick: () => model.show(next.mode) }, kit.icon(next.icon))
  })

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

const more = (kit: Kit, model: CalendarModel, parts: HeadParts, picker: HTMLInputElement) => {
  const run = (close: () => void, action: () => void) => () => {
    close()
    action()
  }
  const exportOwn = () => {
    const calendar = model.writable.get().find(other => other.provider === 'sand' && other.primary)
    if (calendar) model.exportFile(calendar).catch(parts.report)
  }
  return kit.dropdown({
    placement: 'below-right',
    trigger: (press, open) => kit.iconButton({ title: 'More', 'aria-label': 'More', active: open, ...press }, kit.icon('more')),
    items: close => [
      kit.menuItem({ onClick: run(close, () => picker.click()) }, 'Import .ics'),
      kit.menuItem({ onClick: run(close, exportOwn) }, 'Export .ics'),
      kit.menuItem({ onClick: run(close, parts.subscribe) }, 'Subscription link'),
    ],
  })
}

export const headView = (kit: Kit, model: CalendarModel, parts: HeadParts) => {
  const picker = fileInput(model, parts.report)
  return kit.paneHead(
    { class: () => (model.mode.get() === 'agenda' ? kit.pageColumn : '') },
    kit.headTitle(1, () => title(model, parts.narrow.get())),
    kit.secondaryAction({ size: 'sm', onClick: model.today }, 'Today'),
    kit.iconButton({ title: 'Earlier', 'aria-label': 'Earlier', onClick: model.earlier }, kit.icon('left')),
    kit.iconButton({ title: 'Later', 'aria-label': 'Later', onClick: model.later }, kit.icon('right')),
    dynamicChild(parts.narrow, narrow => (narrow ? modeToggle(kit, model) : kit.segmented(modes, model.mode, model.show, { label: 'View' }))),
    kit.iconButton({ title: 'New event', 'aria-label': 'New event', onClick: parts.add }, kit.icon('plus')),
    picker,
    more(kit, model, parts, picker),
  )
}
