import type { ExtensionInfo } from '@sand/web/contract'
import type { Pulse } from '@sand/kit/web'
import type { Kit } from '@sand/ui-kit/contract'
import { div, dynamicChild, show, sig, span } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { details } from './details'
import { interfaceState, lockedIds } from './roles'

const partRow = ({ settingsRow, toggleSwitch }: Kit, extension: ExtensionInfo, toggle: () => void) =>
  settingsRow(
    span({ title: extension.summary ?? '' }, extension.label ?? extension.id),
    toggleSwitch({ on: extension.configured, title: extension.configured ? 'Turn off' : 'Turn on', onClick: toggle }),
  )

export const partsSection = (ctx: Context<'extensions' | 'kit'>, changes: Pulse) => {
  const { chevron, quietButton, rowList, settingsSection } = ctx.kit
  const state = interfaceState(ctx, changes)
  const open = sig(false)
  const toggle = (extension: ExtensionInfo) => (extension.configured ? ctx.extensions.disable(extension.id) : ctx.extensions.enable(extension.id))
  const parts = state.map(({ extensions, roles }) => {
    const swappable = new Set(roles.swaps().flatMap(group => group.candidates.map(candidate => candidate.id)))
    const locked = lockedIds(extensions, roles)
    return extensions.filter(extension => extension.label && !swappable.has(extension.id) && !locked.has(extension.id))
  })
  return div(
    { class: 'flex flex-col gap-6' },
    settingsSection(
      { title: 'Interface parts' },
      rowList(
        parts,
        extension => extension.id,
        extension =>
          dynamicChild(
            extension.map(value => `${value.configured}|${value.label}|${value.summary}`),
            () => partRow(ctx.kit, extension.get(), () => toggle(extension.get())),
          ),
      ),
    ),
    div(
      { class: 'flex flex-col items-start gap-4' },
      quietButton({ size: 'sm', 'aria-expanded': open, onClick: open.toggle() }, chevron(() => open.get(), 14), 'Details for plugin authors'),
      show(open, () => details(ctx, state, toggle)),
    ),
  )
}
