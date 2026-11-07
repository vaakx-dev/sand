import { isMetered, type ModelInfo } from '@sand/accounts/contract'
import { tokens } from '@sand/util'
import { span } from '@vaakx-dev/vrui'
import type { Scene } from './scene'
import { sourceDetail } from './source'

const facts = (model: ModelInfo, scene: Scene, mixed: boolean) => {
  const source = scene.source(model)
  const via = mixed ? source?.via : undefined
  const cost = mixed && source && isMetered(source.billing) ? sourceDetail(source) : undefined
  return [via && `On ${via}`, cost, model.id === scene.defaults.model && 'Default', model.context && tokens(model.context)].filter(Boolean).join(' · ')
}

export const modelRow = (model: ModelInfo, scene: Scene, mixed = false) => {
  const { badge, listRow, modelLogo } = scene.kit
  const on = model.id === scene.shown.model
  return listRow({
    'data-focus': `model:${model.id}`,
    role: 'menuitemradio',
    'aria-checked': String(on),
    surface: 'raised',
    selected: on,
    disabled: scene.offline(scene.source(model)) && !on,
    lead: mixed ? modelLogo(model.provider, 16) : undefined,
    title: model.label,
    trail: [scene.fresh(model) && badge('accent', 'New'), scene.target.badge?.(model), span({ class: 'tabular-nums' }, facts(model, scene, mixed))],
    ...scene.menu.target(() => scene.menuOf(model), () => scene.pick(model)),
  })
}
