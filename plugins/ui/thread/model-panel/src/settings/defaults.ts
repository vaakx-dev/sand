import type { ModelInfo } from '@sand/llm-accounts/contract'
import { segmented, selectMenu, settingsRow, settingsSection, toggleSwitch } from '@sand/dom'
import type { Kit } from './kit'

const save = (kit: Kit, command: string, value: string) =>
  void kit.run({ type: 'ui.command', name: command, args: `${value} --default --quiet`, cwd: kit.ctx.threads.cwd() })

const optionLabel = (kit: Kit, model: ModelInfo) => [model.label, kit.sourceLabel(model)].filter(Boolean).join(' · ')

export const defaultsKey = (kit: Kit) => {
  const models = kit.ctx.models
  return JSON.stringify([
    models.defaults(),
    models.levels(),
    models.list().map(model => [model.id, model.label, model.source, model.efforts, model.fast]),
    models.sources().map(source => source.label),
  ])
}

export const defaultsSection = (kit: Kit) => {
  const models = kit.ctx.models
  const defaults = models.defaults()
  const model = models.info(defaults.model)
  const levels = models
    .levels()
    .filter(level => model?.efforts.includes(level.id))
    .map(level => ({ value: level.id, label: level.label }))
  const fast = defaults.speed === 'fast'
  return settingsSection(
    { title: 'New threads' },
    settingsRow(
      'Model',
      selectMenu(
        models.list().map(info => ({ value: info.id, label: optionLabel(kit, info) })),
        model?.id,
        id => save(kit, 'model', id),
      ),
    ),
    levels.length ? settingsRow('Effort', segmented(levels, defaults.effort ?? model?.defaultEffort, id => save(kit, 'effort', id))) : null,
    model?.fast ? settingsRow('Fast mode', toggleSwitch({ on: fast, 'aria-label': 'Fast mode', onClick: () => save(kit, 'fast', fast ? 'off' : 'on') })) : null,
  )
}
