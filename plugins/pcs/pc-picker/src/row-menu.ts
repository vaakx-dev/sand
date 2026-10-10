import { copyText, type MenuSpec, type NavAction } from '@sand/dom'
import type { Machine, ProjectGroup } from '@sand/web-client/contract'
import { copyOn } from './group'
import { deviceOf, refOf, type PickerContext } from './target'

export const rowMenu = (ctx: PickerContext, group: ProjectGroup, machine: Machine, choose: () => void): MenuSpec => {
  const location = copyOn(group, deviceOf(machine))
  const copyPath = async () => {
    const copied = await copyText(location?.path ?? '')
    ctx.notify?.push(copied ? 'Copied path' : 'Could not copy the path', { level: copied ? 'info' : 'error' })
  }
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
