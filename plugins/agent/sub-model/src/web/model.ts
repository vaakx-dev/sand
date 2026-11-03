import type { PickerTarget } from '@sand/model-picker/contract'
import { show } from '@vaakx-dev/vrui'
import { type ChosenModel, subModelSet } from '../contract'
import type { Rows } from './context'

const save = ({ ctx }: Rows, model: ChosenModel | null) =>
  void ctx.wire.call(subModelSet, { tier: 'fast', model }).catch(error => ctx.report(error))

const fastTarget = (rows: Rows): PickerTarget => ({
  shown: () => rows.ctx.modelPicker.resolve(rows.state.get()?.models.fast ?? {}),
  set: ({ model, effort, speed }) => {
    const own = rows.state.get()?.models.fast
    const next = model ? { model } : own && { ...own, ...(effort && { effort }), ...(speed && { speed }) }
    if (next) save(rows, next)
  },
})

export const modelRow = (rows: Rows) => {
  const { icon, iconButton, settingsRow } = rows.ctx.kit
  const clear = () =>
    iconButton({ title: 'Use the default model', 'aria-label': 'Use the default model', onClick: () => save(rows, null) }, icon('x'))
  return settingsRow(
    { title: 'Sub model', detail: 'For background jobs; falls back to Model' },
    show(() => Boolean(rows.state.get()?.models.fast), clear),
    rows.ctx.modelPicker.button(fastTarget(rows), 'Sub model'),
  )
}
