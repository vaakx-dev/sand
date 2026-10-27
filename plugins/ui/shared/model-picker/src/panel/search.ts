import type { ModelInfo } from '@sand/accounts/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { div, media } from '@vaakx-dev/vrui'
import type { Scene } from './scene'
import type { View } from './view'

export const findModels = (scene: Scene, query: string): ModelInfo[] => {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  return scene.models.filter(model => {
    const text = `${model.label} ${model.name ?? model.id} ${scene.source(model)?.label ?? ''}`.toLowerCase()
    return words.every(word => text.includes(word))
  })
}

export const modelSearch = ({ returnFocus, searchField }: Kit, view: View, pickFirst: () => void) => {
  const fine = media('(pointer: fine)')
  return div(
    { class: 'mb-1 flex shrink-0' },
    searchField({
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
        const restore = returnFocus(node, document.activeElement)
        if (fine.get()) node.focus()
        return restore
      },
    }),
  )
}
