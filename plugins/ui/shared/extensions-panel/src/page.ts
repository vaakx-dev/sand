import type { ExtensionInfo } from '@sand/web/contract'
import { chevron, div, dynamicChild, el, list, quietButton, secondaryAction, settingsSection, show, sig, span, type Child, type Pulse } from '@sand/dom'
import type { Context } from 'drydock'
import { cardModel, extensionCard } from './card'
import { choiceRow } from './choices'
import { copyId } from './menu'
import { partRow } from './parts'
import { readRoles, type Roles } from './roles'

const self = 'extensions-panel'

const lockedIds = (roles: Roles) => new Set([self, roles.provider('settings')])

const heading = (text: Child) => el('h3', { class: 'mt-6 mb-2 text-xs font-medium text-neutral-500' }, text)

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

const readState = (ctx: Context<'extensions'>, changes: Pulse, seen: Map<string, Set<string>>) =>
  changes.read(() => ({ extensions: ctx.extensions.list(), roles: readRoles(ctx, seen) }))

const details = (ctx: Context<'extensions'>, state: ReturnType<typeof readState>, toggle: (extension: ExtensionInfo) => void) => {
  const cards = state.map(({ extensions, roles }) => extensions.map(extension => cardModel(extension, roles, lockedIds(roles).has(extension.id))))
  return div(
    heading('Who provides what'),
    dynamicChild(state, ({ roles }) => roleMap(roles)),
    heading(() => `Extensions (${state.get().extensions.length})`),
    list(cards, card => card.extension.id, card =>
      dynamicChild(
        card.map(value => JSON.stringify(value)),
        () => extensionCard(card.get(), () => toggle(card.get().extension), () => void copyId(ctx, card.get().extension.id)),
      ),
    ),
    div(
      { class: 'mt-4 flex items-center gap-2' },
      secondaryAction({ onClick: () => ctx.extensions.reset() }, 'Reset to defaults'),
      span({ class: 'text-xs text-neutral-500' }, `build ${ctx.extensions.build().slice(-8)}`),
    ),
  )
}

export const interfacePage = (ctx: Context<'extensions'>, changes: Pulse) => {
  const state = readState(ctx, changes, new Map())
  const open = sig(false)
  const toggle = (extension: ExtensionInfo) => (extension.configured ? ctx.extensions.disable(extension.id) : ctx.extensions.enable(extension.id))
  const swaps = state.map(({ roles, extensions }) => roles.swaps(extensions))
  const parts = state.map(({ extensions, roles }) => {
    const swappable = new Set(roles.swaps(extensions).flatMap(group => group.candidates.map(candidate => candidate.id)))
    const locked = lockedIds(roles)
    return extensions.filter(extension => extension.label && !swappable.has(extension.id) && !locked.has(extension.id))
  })

  return div(
    { class: 'flex flex-col gap-6' },
    settingsSection(
      {},
      dynamicChild(swaps, groups => div({ class: 'contents' }, groups.map(group => choiceRow(ctx.extensions, group.role, group.candidates, state.get().roles)))),
    ),
    settingsSection(
      { title: 'Parts' },
      list(
        parts,
        extension => extension.id,
        extension =>
          dynamicChild(
            extension.map(value => `${value.configured}|${value.label}|${value.summary}`),
            () => partRow(extension.get(), () => toggle(extension.get())),
          ),
        div({ class: 'contents' }),
      ),
    ),
    div(
      quietButton(
        { size: 'sm', 'aria-expanded': open, onClick: () => open.set(!open.get()) },
        chevron(() => open.get(), 12),
        'Details for plugin authors',
      ),
      show(open, () => details(ctx, state, toggle)),
    ),
  )
}
