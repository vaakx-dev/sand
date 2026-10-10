import { copyWithNotice, type MenuSpec, type NavAction } from '@sand/dom'
import type { Machine, ProjectGroup } from '@sand/web-client/contract'
import { copyOn } from './group'
import { refOf, type PickerContext } from './target'

export const rowMenu = (ctx: PickerContext, group: ProjectGroup, machine: Machine, choose: () => void): MenuSpec => {
  const location = copyOn(group, machine.device)
  const copyPath = () => copyWithNotice(ctx.notify, location?.path ?? '', 'path')
  const list: (NavAction | false)[] = [
    machine.online && { id: 'run', label: 'Run here', icon: 'laptop', group: 'run', run: choose },
    Boolean(location && ctx.sync && machine.online) && {
      id: 'refresh',
      label: 'Refresh status',
      icon: 'reload',
      group: 'status',
      run: () => (location ? ctx.sync?.refresh(refOf(location)).catch(() => undefined) : undefined),
    },
    Boolean(location) && { id: 'copy-path', label: 'Copy path', icon: 'folder', group: 'copy', run: copyPath },
  ]
  return { title: machine.name, subtitle: location?.path, actions: list.filter(action => action !== false) }
}
