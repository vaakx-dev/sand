import { copyText, type MenuSpec, type NavAction } from '@sand/dom'
import type { ModelMenuInput } from './contract'

export const modelMenu = ({ model, subtitle, notify, use, makeDefault, toggleFavourite, toggleHidden, remove }: ModelMenuInput): MenuSpec => {
  const favourite = model.favourite !== undefined
  const copy = async () => {
    const copied = await copyText(model.name ?? model.id)
    notify?.push(copied ? 'Copied the model id' : 'Could not copy the model id', { level: copied ? 'info' : 'error' })
  }
  const actions: (NavAction | false)[] = [
    use !== undefined && { id: 'use', label: 'Use this model', icon: 'check', group: 'use', quick: true, run: use },
    makeDefault !== undefined && { id: 'default', label: 'Make default', icon: 'pin', group: 'use', run: makeDefault },
    toggleFavourite !== undefined && {
      id: 'favourite',
      label: favourite ? 'Unfavourite' : 'Favourite',
      icon: 'star',
      group: 'list',
      quick: true,
      active: favourite,
      run: toggleFavourite,
    },
    toggleHidden !== undefined && { id: 'hidden', label: model.hidden ? 'Show in picker' : 'Hide from picker', icon: 'eye', group: 'list', run: toggleHidden },
    { id: 'copy-id', label: 'Copy model id', icon: 'copy', group: 'copy', run: copy },
    remove !== undefined && { id: 'remove', label: 'Remove', icon: 'trash', group: 'remove', danger: true, run: remove },
  ]
  return { title: model.label, subtitle, actions: actions.filter(action => action !== false) }
}
