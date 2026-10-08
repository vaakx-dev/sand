import { dynamicChild, errorMessage, segmented, selectMenu, settingsRow, settingsSection, toggleSwitch, type Pulse } from '@sand/dom'
import type { PanelContext } from './actions'

type Save = (command: string, value: string) => void

const saver =
  (ctx: PanelContext, fail: (text: string) => void): Save =>
  (command, value) => {
    if (!ctx.wire) return fail(`Not connected, so /${command} cannot run`)
    ctx.wire.call({ type: 'ui.command', name: command, args: `${value} --default --quiet`, cwd: ctx.threads.cwd() }).catch(error => fail(errorMessage(error)))
  }

const defaultsSection = (ctx: PanelContext, save: Save) => {
  const defaults = ctx.models.defaults()
  const model = ctx.models.info(defaults.model)
  const levels = ctx.models
    .levels()
    .filter(level => model?.efforts.includes(level.id))
    .map(level => ({ value: level.id, label: level.label }))
  const fast = defaults.speed === 'fast'
  return settingsSection(
    { title: 'New threads' },
    settingsRow('Model', selectMenu(ctx.models.list().map(info => ({ value: info.id, label: info.label })), model?.id, id => save('model', id))),
    levels.length ? settingsRow('Effort', segmented(levels, defaults.effort ?? model?.defaultEffort, id => save('effort', id))) : null,
    model?.fast ? settingsRow('Fast mode', toggleSwitch({ on: fast, 'aria-label': 'Fast mode', onClick: () => save('fast', fast ? 'off' : 'on') })) : null,
  )
}

export const defaultsPage = (ctx: PanelContext, changes: Pulse, fail: (text: string) => void) => {
  const save = saver(ctx, fail)
  return dynamicChild(changes.version, () => defaultsSection(ctx, save))
}
