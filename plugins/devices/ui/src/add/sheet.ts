import type { DeviceRecord } from '@sand/devices-contract'
import type { SheetSpec } from '@sand/ui-shell/contract'
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

export const addSheet = (ui: Ui, start: AddStep, close: () => void): SheetSpec => {
  const { secondaryAction, sheetBody, sheetFoot } = ui.kit
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

  const foot = () => {
    const current = view.get()
    return isDone(current) && current.again ? sheetFoot(secondaryAction({ onClick: () => go('phone') }, 'Add another')) : null
  }

  return {
    label: 'Add',
    look: 'bare',
    title: () => (isDone(view.get()) ? '' : titles[step.get() as AddStep]),
    back: () => (step.get() === 'list' || step.get() === 'done' ? undefined : () => go('list')),
    body: () => [
      sheetBody({}, dynamicChild(step, body)),
      dynamicChild(step, foot),
    ],
    onClose: close,
  }
}
