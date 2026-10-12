import type { ExtensionInfo } from '@sand/web/contract'
import { copyWithNotice } from '@sand/kit/web'
import { div, dynamicChild, el, span } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { cardModel, extensionCard } from './card'
import { lockedIds, type InterfaceState, type Roles } from './roles'

const roleMap = (roles: Roles) =>
  div(
    { class: 'flex min-w-0 flex-1 flex-col gap-1 py-1 font-mono text-xs text-neutral-400' },
    roles.all().map(role => {
      const shadowed = roles.shadowed(role)
      return div(
        { class: 'flex gap-3' },
        el('b', { class: 'w-24 shrink-0 font-medium text-accent-400' }, role),
        span(roles.provider(role) ?? '', shadowed.length ? span({ class: 'text-neutral-500' }, ` (shadows ${shadowed.join(', ')})`) : null),
      )
    }),
  )

const resetAction = (ctx: Context<'extensions' | 'kit'>) => {
  const { secondaryAction } = ctx.kit
  return div(
    { class: 'flex items-center gap-3' },
    span({ class: 'text-xs text-neutral-500' }, `build ${ctx.extensions.build().slice(-8)}`),
    secondaryAction({ size: 'sm', onClick: () => ctx.extensions.reset() }, 'Reset to defaults'),
  )
}

export const details = (ctx: Context<'extensions' | 'kit'>, state: InterfaceState, toggle: (extension: ExtensionInfo) => void) => {
  const { rowList, sectionRow, settingsSection } = ctx.kit
  const cards = state.map(({ extensions, roles }) => {
    const locked = lockedIds(extensions, roles)
    return extensions.map(extension => cardModel(extension, roles, locked.has(extension.id)))
  })
  return div(
    { class: 'flex w-full flex-col gap-6' },
    settingsSection(
      { title: 'Who provides what' },
      sectionRow({}, dynamicChild(state, ({ roles }) => roleMap(roles))),
    ),
    settingsSection(
      { title: () => `Extensions (${state.get().extensions.length})`, action: resetAction(ctx) },
      rowList(
        cards,
        card => card.extension.id,
        card =>
          dynamicChild(
            card.map(value => JSON.stringify(value)),
            () => extensionCard(ctx.kit, card.get(), () => toggle(card.get().extension), () => void copyWithNotice(ctx.notify, card.get().extension.id, 'id')),
          ),
      ),
    ),
  )
}
