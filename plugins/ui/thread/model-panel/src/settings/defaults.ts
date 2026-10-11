import type { ModelInfo } from '@sand/llm-accounts/contract'
import type { PickerTarget } from '@sand/model-picker/contract'
import { settingsRow, settingsSection } from '@sand/dom'
import { speedWords } from '../actions'
import type { Kit } from './kit'

const save = (kit: Kit, command: string, value: string) =>
  void kit.run({ type: 'ui.command', name: command, args: `${value} --default --quiet`, cwd: kit.ctx.threads.cwd() })

export const makeDefault = (kit: Kit, model: ModelInfo) => save(kit, 'model', model.id)

const defaultsTarget = (kit: Kit): PickerTarget => ({
  shown: () => kit.ctx.modelPicker.resolve(kit.ctx.models.defaults()),
  set: patch => {
    if (patch.model) save(kit, 'model', patch.model)
    if (patch.effort) save(kit, 'effort', patch.effort)
    if (patch.speed) save(kit, 'fast', speedWords[patch.speed])
  },
})

export const defaultsSection = (kit: Kit) =>
  settingsSection({ title: 'New threads' }, settingsRow('Model', kit.ctx.modelPicker.button(defaultsTarget(kit), 'Model for new threads'), 'With its effort and fast mode'))
