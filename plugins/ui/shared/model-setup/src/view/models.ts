import type { ModelInfo, SourceInfo } from '@sand/accounts/contract'
import type { Models } from '@sand/web-client/contract'
import type { Pulse } from '@sand/web-client/reactive'
import { tokens } from '@sand/util'
import type { Kit } from '@sand/ui-kit/contract'
import { div, dynamicChild, span, type Child, type Sig } from '@vaakx-dev/vrui'

type Picked = Sig<string | undefined>

interface Group {
  source: SourceInfo
  models: ModelInfo[]
}

export interface ListOptions {
  label: string
  left?: string
  lead?: () => Child
}

const steps: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }

const moveChoice = (event: KeyboardEvent) => {
  const step = steps[event.key]
  const group = event.currentTarget
  if (!step || !(group instanceof HTMLElement)) return
  event.preventDefault()
  const radios = [...group.querySelectorAll<HTMLElement>('[role="radio"]')]
  const index = radios.findIndex(radio => radio === document.activeElement)
  const next = radios[(index + step + radios.length) % radios.length]
  next?.focus()
  next?.click()
}

const groupsOf = (models: Models, left?: string): Group[] =>
  models
    .sources()
    .map(source => ({ source, models: models.list().filter(model => model.source === source.id && model.id !== left) }))
    .filter(group => group.models.length)

const groupsKey = (groups: Group[]) => JSON.stringify(groups.map(({ source, models }) => [source.id, models.map(model => model.id)]))

const modelChoice = ({ listRow }: Kit, picked: Picked, model: ModelInfo) => {
  const on = () => picked.get() === model.id
  return listRow({
    role: 'radio',
    'aria-checked': () => String(on()),
    tabIndex: () => (on() || !picked.get() ? 0 : -1),
    surface: 'group',
    selected: on,
    title: model.label,
    trail: span({ class: 'tabular-nums' }, model.context ? tokens(model.context) : ''),
    onClick: () => picked.set(model.id),
  })
}

const groupTitle = ({ modelLogo }: Kit, { provider, label, via }: SourceInfo) =>
  span({ class: 'inline-flex max-w-full items-center gap-2' }, modelLogo(provider, 14), span({ class: 'truncate' }, via ? `${label} on ${via}` : label))

export const modelList = (kit: Kit, models: Models, changes: Pulse, picked: Picked, { label, left, lead }: ListOptions) => {
  const { emptyState, settingsSection } = kit
  return dynamicChild(
    changes.read(() => groupsKey(groupsOf(models))),
    () => {
      if (!models.list().length) return emptyState({ text: 'No models yet. They show up here once your account lists them.' })
      return div(
        { role: 'radiogroup', 'aria-label': label, class: 'flex flex-col gap-4', onKeyDown: moveChoice },
        lead?.(),
        groupsOf(models, left).map(group =>
          settingsSection({ title: groupTitle(kit, group.source) }, group.models.map(model => modelChoice(kit, picked, model))),
        ),
      )
    },
  )
}
