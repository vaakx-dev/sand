import type { DeviceRecord } from '@sand/devices-contract'
import { derive, dynamicChild, effect, sig } from '@vaakx-dev/vrui'
import { doneBlock } from '../shared/parts'
import type { AddStep, Ui } from '../ui'
import type { AddDone, AddView } from './done'
import { installStep } from './install'
import { whenJoined } from './joining'
import { linkStep } from './link'
import { listStep } from './list'
import { phoneStep } from './phone'

const titles: Record<AddStep, string> = { list: 'Add', phone: 'Add a phone or browser', install: 'Install sand on a new PC', link: 'Use a link instead' }

const isDone = (view: AddView): view is AddDone => typeof view !== 'string'

export const addSheet = (ui: Ui, start: AddStep, close: () => void) => {
  const { overlay, primaryAction, secondaryAction, sheet, sheetBody, sheetFoot, sheetHead } = ui.kit
  const view = sig<AddView>(start)
  const joined = sig<DeviceRecord[]>([])
  const step = derive(() => {
    const current = view.get()
    return isDone(current) ? 'done' : current
  })
  const go = (next: AddStep) => view.set(next)
  const done = (result: AddDone) => view.set(result)

  effect(() => whenJoined(ui, (title, text) => done({ title, text })))

  const body = (key: AddStep | 'done'): HTMLElement => {
    const current = view.get()
    if (isDone(current)) return doneBlock(ui.kit, current.title, current.text)
    if (key === 'phone') return phoneStep(ui, done)
    if (key === 'install') return installStep(ui)
    if (key === 'link') return linkStep(ui, done)
    return listStep(ui, joined, go)
  }

  const foot = (key: AddStep | 'done') => {
    const current = view.get()
    const doneButton = primaryAction({ onClick: close }, 'Done')
    if (isDone(current))
      return sheetFoot(current.again ? secondaryAction({ onClick: () => go('phone') }, 'Add another') : null, doneButton)
    if (key === 'install' || (key === 'list' && joined.get().length)) return sheetFoot(doneButton)
    return null
  }

  return overlay(
    close,
    sheet(
      { 'aria-label': 'Add', size: 'md' },
      sheetHead({
        title: () => (isDone(view.get()) ? '' : titles[step.get() as AddStep]),
        close,
        back: () => go('list'),
        backShown: () => step.get() !== 'list' && step.get() !== 'done',
      }),
      sheetBody({}, dynamicChild(step, body)),
      dynamicChild(
        derive(() => `${step.get()}:${joined.get().length > 0}`),
        () => foot(step.get()),
      ),
    ),
  )
}
