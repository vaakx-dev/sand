import type { ModelInfo, SourceInfo } from '@sand/llm-accounts/contract'
import type { Models } from '@sand/web-client/contract'
import { div, dynamicChild, modelLogo, p, providerIcon, radioMark, rowButton, settingsSection, span, type Child, type Pulse, type Sig } from '@sand/dom'
import { sourceName, tokens } from '@sand/kit'

type Picked = Sig<string | undefined>

interface Group {
  source: SourceInfo
  models: ModelInfo[]
}

const groupsOf = (models: Models, left?: string): Group[] =>
  models
    .sources()
    .map(source => ({ source, models: models.list().filter(model => model.source === source.id && model.id !== left) }))
    .filter(group => group.models.length)

const groupsKey = (groups: Group[]) => JSON.stringify(groups.map(({ source, models }) => [source.id, models.map(model => model.id)]))

export const choiceRow = (picked: Picked, id: string, ...children: Child[]) => {
  const on = () => picked.get() === id
  return rowButton(
    {
      role: 'radio',
      'aria-checked': () => String(on()),
      class: ['gap-3 px-4 py-3 transition-colors', () => (on() ? 'bg-accent-950' : 'bg-neutral-900 hover:bg-neutral-800')],
      onClick: () => picked.set(id),
    },
    radioMark(on),
    ...children,
  )
}

const modelName = (model: ModelInfo) =>
  span({ class: 'flex min-w-0 flex-1 items-center gap-2' }, modelLogo(model.provider, 14), span({ class: 'truncate text-sm font-medium text-neutral-100' }, model.label))

const modelChoice = (picked: Picked, model: ModelInfo) =>
  choiceRow(picked, model.id, modelName(model), span({ class: 'font-mono text-xs text-neutral-500' }, model.context ? tokens(model.context) : ''))

const groupTitle = (source: SourceInfo) => span({ class: 'flex items-center gap-2' }, providerIcon(source.provider, 12), sourceName(source))

const empty = () => p({ class: 'text-sm text-neutral-400' }, 'No models yet. They show up here once your account lists them.')

export const modelList = (models: Models, changes: Pulse, picked: Picked, label: string, left?: string) =>
  dynamicChild(
    changes.read(() => groupsKey(groupsOf(models, left))),
    () => {
      const groups = groupsOf(models, left)
      if (!groups.length) return empty()
      return div(
        { role: 'radiogroup', 'aria-label': label, class: 'flex flex-col gap-4' },
        groups.map(group => settingsSection({ title: groupTitle(group.source) }, group.models.map(model => modelChoice(picked, model)))),
      )
    },
  )
