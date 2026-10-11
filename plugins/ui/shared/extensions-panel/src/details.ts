import type { ExtensionInfo } from '@sand/web/contract'
import { copyWithNotice, div, dynamicChild, el, h3, list, secondaryAction, span, type Child } from '@sand/dom'
import type { Context } from 'drydock'
import { cardModel, extensionCard } from './card'
import { lockedIds, type InterfaceState, type Roles } from './roles'

const heading = (text: Child) => h3({ class: 'mt-6 mb-2 text-xs font-medium text-neutral-500' }, text)

const roleMap = (roles: Roles) =>
  div(
    { class: 'flex flex-col gap-1 font-mono text-xs text-neutral-400' },
    roles.all().map(role => {
      const shadowed = roles.shadowed(role)
      return div(
        { class: 'flex gap-3' },
        el('b', { class: 'w-24 shrink-0 font-medium text-accent-400' }, role),
        span(roles.provider(role) ?? '', shadowed.length ? span({ class: 'text-neutral-500' }, ` (shadows ${shadowed.join(', ')})`) : null),
      )
    }),
  )

export const details = (ctx: Context<'extensions'>, state: InterfaceState, toggle: (extension: ExtensionInfo) => void) => {
  const cards = state.map(({ extensions, roles }) => extensions.map(extension => cardModel(extension, roles, lockedIds(roles).has(extension.id))))
  return div(
    heading('Who provides what'),
    dynamicChild(state, ({ roles }) => roleMap(roles)),
    heading(() => `Extensions (${state.get().extensions.length})`),
    list(cards, card => card.extension.id, card =>
      dynamicChild(
        card.map(value => JSON.stringify(value)),
        () => extensionCard(card.get(), () => toggle(card.get().extension), () => void copyWithNotice(ctx.notify, card.get().extension.id, 'id')),
      ),
    ),
    div(
      { class: 'mt-4 flex items-center gap-2' },
      secondaryAction({ onClick: () => ctx.extensions.reset() }, 'Reset to defaults'),
      span({ class: 'text-xs text-neutral-500' }, `build ${ctx.extensions.build().slice(-8)}`),
    ),
  )
}
