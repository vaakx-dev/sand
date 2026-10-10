import type { ModelInfo } from '@sand/llm-accounts/contract'
import { div, finePointer, icon, searchInput } from '@sand/dom'
import type { PanelContext } from '../actions'
import type { Scene } from './scene'
import type { View } from './view'

export const findModels = (scene: Scene, query: string): ModelInfo[] => {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  return scene.models.filter(model => {
    const text = `${model.label} ${model.name ?? model.id} ${scene.source(model)?.label ?? ''}`.toLowerCase()
    return words.every(word => text.includes(word))
  })
}

const restoreFocus = (ctx: PanelContext, node: HTMLElement) => () => {
  if (document.activeElement === node || document.activeElement === document.body) ctx.composer?.focus()
}

export const searchField = (ctx: PanelContext, view: View, pickFirst: () => void) => {
  const fine = finePointer()
  return div(
    { class: 'mx-1 mt-1 mb-2 flex h-10 shrink-0 items-center gap-2 rounded-lg bg-neutral-900 px-3 text-neutral-500' },
    icon('search', 15),
    searchInput({
      type: 'search',
      placeholder: 'Search all models',
      'aria-label': 'Search all models',
      bindValue: view.query,
      onKeyDown: event => {
        if (event.isComposing) return
        if (event.key === 'Escape' && view.query.get()) {
          event.preventDefault()
          view.query.set('')
        }
        if (event.key === 'Enter' && view.query.get().trim()) {
          event.preventDefault()
          pickFirst()
        }
      },
      onMount: node => {
        if (fine.get()) node.focus()
        return restoreFocus(ctx, node)
      },
    }),
  )
}
