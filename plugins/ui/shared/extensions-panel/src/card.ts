import type { ExtensionInfo } from '@sand/web/contract'
import { contextMenu, div, dot, span, toggleSwitch, type Child, type MenuSpec, type NavAction, type Tone } from '@sand/dom'
import type { Roles } from './roles'

const statusText: Record<string, string> = { off: 'off', pending: 'waiting', starting: 'starting', active: 'active', failed: 'failed', disposed: 'off' }

const statusTone: Record<string, string> = {
  pending: 'text-warning-400',
  starting: 'text-warning-400',
  failed: 'text-danger-400',
  active: 'text-success-400',
}

interface Dependency {
  role: string
  tone: Tone
  note: string
  tip: string
}

export interface CardModel {
  extension: ExtensionInfo
  provides: string[]
  needs: Dependency[]
  locked: boolean
}

const provided = (role: string, provider: string): Dependency => ({ role, tone: 'success', note: `← ${provider}`, tip: `${role} comes from ${provider}` })

const injected = (role: string, roles: Roles): Dependency => {
  const provider = roles.provider(role)
  if (provider) return provided(role, provider)
  return { role, tone: 'danger', note: 'waiting', tip: `Waits for an extension that provides ${role}` }
}

const used = (role: string, fallback: string, roles: Roles): Dependency => {
  const provider = roles.provider(role)
  if (provider) return provided(role, provider)
  return { role, tone: 'warning', note: `fallback: ${fallback}`, tip: `Nothing provides ${role}, so ${fallback}` }
}

export const cardModel = (extension: ExtensionInfo, roles: Roles, locked: boolean): CardModel => ({
  extension,
  provides: roles.provides(extension),
  needs: [...extension.inject.map(role => injected(role, roles)), ...Object.entries(extension.uses).map(([role, fallback]) => used(role, fallback, roles))],
  locked,
})

const cardMenu = ({ extension, locked }: CardModel, toggle: () => void, copyId: () => void): MenuSpec => {
  const actions: NavAction[] = []
  if (!locked) actions.push({ id: 'toggle', label: extension.configured ? 'Disable' : 'Enable', icon: extension.configured ? 'x' : 'check', group: 'toggle', run: toggle })
  actions.push({ id: 'copy-id', label: 'Copy id', icon: 'copy', group: 'copy', run: copyId })
  return { title: extension.id, subtitle: extension.description, actions }
}

const toggleTitle = ({ extension, locked }: CardModel) => {
  if (locked) return 'Kept on so you can get back here'
  return extension.configured ? 'Disable' : 'Enable'
}

const roleChip = (tone: string, title: string | undefined, ...children: Child[]) =>
  span({ class: ['inline-flex min-h-5 max-w-full items-center gap-1 rounded-md px-2 font-mono text-xs', tone], title }, ...children)

const status = (extension: ExtensionInfo) =>
  extension.configured && !extension.bundled
    ? span({ class: 'ml-auto shrink-0 text-xs text-danger-400', title: 'The build failed; the server log has the error' }, 'not built')
    : span({ class: ['ml-auto shrink-0 text-xs', statusTone[extension.status] ?? 'text-neutral-500'] }, statusText[extension.status] ?? extension.status)

const roleChips = ({ provides, needs }: CardModel) => {
  if (!provides.length && !needs.length) return null
  return div(
    { class: 'mt-2 flex flex-wrap gap-1' },
    provides.map(role => roleChip('bg-accent-950 text-accent-400', undefined, `provides ${role}`)),
    needs.map(need => roleChip('bg-neutral-700 text-neutral-400', need.tip, dot(need.tone), need.role, span({ class: 'truncate font-sans text-neutral-500' }, need.note))),
  )
}

export const extensionCard = (model: CardModel, toggle: () => void, copyId: () => void) => {
  const { extension, locked } = model
  const menu = contextMenu()
  return div(
    { class: ['mb-2 rounded-xl bg-neutral-800 p-3', !extension.configured && 'opacity-50'], ...menu.target(() => cardMenu(model, toggle, copyId)) },
    menu.view(),
    div(
      { class: 'flex min-w-0 items-center gap-3' },
      toggleSwitch({ on: extension.configured, disabled: locked, title: toggleTitle(model), onClick: toggle }),
      span({ class: 'shrink-0 font-mono text-sm font-semibold text-neutral-100' }, extension.id),
      span(
        { class: 'hidden min-w-0 flex-1 truncate text-xs text-neutral-400 md:block', title: extension.description ?? '' },
        extension.description ?? (extension.bundled ? '' : 'not in this build'),
      ),
      status(extension),
    ),
    roleChips(model),
    extension.error && div({ class: 'mt-2 whitespace-pre-wrap wrap-anywhere font-mono text-xs text-danger-400' }, extension.error),
  )
}
