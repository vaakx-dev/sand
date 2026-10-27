import { header } from '@sand/header/contract'
import { layout, layoutChange } from '@sand/layout/contract'
import type { kit } from '@sand/ui-kit/contract'
import { pulse } from '@sand/web-client/reactive'
import { derive, show, type Derive } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { panelsChange } from './contract'
import type { Surface } from './surface'

export const panelToggle = (ctx: Context<{ kit: typeof kit }>, surface: Surface, attention: Derive<boolean>) => {
  const { icon, iconButton, withDot } = ctx.kit
  const changes = pulse(ctx, [panelsChange, layoutChange], [layout])
  const shown = changes.read(() => surface.open())
  const docked = changes.read(() => surface.open() && !surface.covering())
  const label = () => (shown.get() ? 'Hide the panel' : 'Show the panel')
  const flagged = derive(() => attention.get() && !shown.get())
  const button = () =>
    iconButton(
      { active: shown, title: label, 'aria-label': label, onClick: () => surface.setOpen(!surface.open()) },
      withDot(icon('panel'), () => flagged.get()),
    )
  const inHeader = () => show(docked.map(value => !value), button)
  ctx.watch(header, found => found?.slot(inHeader, 100))
  return button
}
