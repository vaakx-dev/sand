import { copyWithNotice } from '@sand/kit/web'
import type { MenuSpec, NavAction } from '@sand/protocol'
import type { Machine, ProjectGroup } from '@sand/web-client/contract'
import { copyOn } from './group'
import { refOf, type PickerContext } from './target'

export const rowMenu = (ctx: PickerContext, group: ProjectGroup, machine: Machine, choose: () => void): MenuSpec => {
  const location = copyOn(group, machine.id)
  const sync = ctx.sync
  const list: (NavAction | false | undefined)[] = [
    machine.online && { id: 'run', label: 'Run here', icon: 'laptop', group: 'run', run: choose },
    location && sync && machine.online && { id: 'refresh', label: 'Refresh status', icon: 'reload', group: 'status', run: () => void sync.refresh(refOf(location)) },
    location && { id: 'copy-path', label: 'Copy path', icon: 'folder', group: 'copy', run: () => copyWithNotice(ctx.notify, location.path, 'path') },
  ]
  return { title: machine.name, subtitle: location?.path, actions: list.filter(action => !!action) }
}
