import { copyWithNotice } from '@sand/kit/web'
import type { MenuSpec, NavAction } from '@sand/protocol'
import type { ModelMenuInput } from './contract'

export const modelMenu = ({ model, subtitle, notify, use, makeDefault, toggleFavourite, toggleHidden, remove }: ModelMenuInput): MenuSpec => {
  const favourite = model.favourite !== undefined
  const copy = () => copyWithNotice(notify, model.name ?? model.id, 'model id', 'Copied the model id')
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
