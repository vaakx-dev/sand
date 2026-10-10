import type { ModelInfo, SourceInfo } from '@sand/llm-accounts/contract'
import { div, errorMessage, keys, p, secondaryAction, sig, textInput } from '@sand/dom'
import type { Catalog } from './catalog'

const examples: Record<string, string> = {
  openrouter: 'openai/gpt-oss-120b',
  server: 'qwen3-coder:30b',
  claude: 'claude-opus-5-5',
  anthropic: 'claude-opus-5-5',
  codex: 'gpt-6.1-sol',
  openai: 'gpt-6.1',
}

const example = (source: SourceInfo) => examples[source.kind] ?? examples[source.id] ?? 'the model id'

export const addRow = (source: SourceInfo, catalog: Catalog, added: (model: ModelInfo) => void) => {
  const name = sig('')
  const busy = sig(false)
  const error = sig('')
  const ready = () => !busy.get() && !!name.get().trim()

  const add = async () => {
    if (!ready()) return
    busy.set(true)
    error.set('')
    try {
      added(await catalog.add(name.get().trim()))
      name.set('')
    } catch (failure) {
      error.set(errorMessage(failure))
    } finally {
      busy.set(false)
    }
  }

  return div(
    { class: 'flex flex-col gap-2 bg-neutral-900 px-4 py-3' },
    div(
      { class: 'flex items-center gap-2' },
      textInput({
        placeholder: `Add by slug, like ${example(source)}`,
        'aria-label': 'Model slug',
        bindValue: name,
        onInput: () => error.set(''),
        onKeyDown: keys({ Enter: () => void add() }),
      }),
      secondaryAction({ disabled: () => !ready(), onClick: () => void add() }, 'Add'),
    ),
    p({ class: 'text-xs wrap-anywhere text-danger-400', hidden: () => !error.get() }, () => error.get()),
  )
}
