import type { ModelInfo, SourceInfo } from '@sand/llm-accounts/contract'
import type { Models } from '@sand/web-client/contract'
import { sourceName, tokens } from '@sand/kit'
import type { Pulse } from '@sand/kit/web'
import type { Kit } from '@sand/ui-kit/contract'
import { div, dynamicChild, p, span, type Child, type Sig } from '@vaakx-dev/vrui'

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

export const choiceRow = ({ radioMark, rowButton }: Kit, picked: Picked, id: string, ...children: Child[]) => {
  const on = () => picked.get() === id
  return rowButton(
    {
      role: 'radio',
      'aria-checked': () => String(on()),
      tabIndex: () => (on() || !picked.get() ? 0 : -1),
      class: ['gap-3 px-4 py-3 transition-colors', () => (on() ? 'bg-accent-950' : 'bg-neutral-900 hover:bg-neutral-800')],
      onClick: () => picked.set(id),
    },
    radioMark(on),
    ...children,
  )
}

const modelChoice = (kit: Kit, picked: Picked, model: ModelInfo) => {
  const { modelLogo } = kit
  return choiceRow(
    kit,
    picked,
    model.id,
    span({ class: 'flex min-w-0 flex-1 items-center gap-2' }, modelLogo(model.provider, 14), span({ class: 'truncate text-sm font-medium text-neutral-100' }, model.label)),
    span({ class: 'font-mono text-xs text-neutral-500' }, model.context ? tokens(model.context) : ''),
  )
}

const groupTitle = ({ providerIcon }: Kit, source: SourceInfo) => span({ class: 'flex items-center gap-2' }, providerIcon(source.provider, 12), sourceName(source))

const empty = () => p({ class: 'text-sm text-neutral-400' }, 'No models yet. They show up here once your account lists them.')

export const modelList = (kit: Kit, models: Models, changes: Pulse, picked: Picked, { label, left, lead }: ListOptions) => {
  const { settingsSection } = kit
  return dynamicChild(
    changes.read(() => groupsKey(groupsOf(models))),
    () => {
      if (!models.list().length) return empty()
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
