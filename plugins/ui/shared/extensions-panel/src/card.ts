import type { ExtensionInfo } from '@sand/web/contract'
import { capital } from '@sand/kit'
import type { MenuSpec, NavAction } from '@sand/protocol'
import type { Kit, Tone } from '@sand/ui-kit/contract'
import { div, span, type Child } from '@vaakx-dev/vrui'
import type { Roles } from './roles'

const statusText: Record<string, string> = { off: 'Off', pending: 'Waiting', starting: 'Starting', active: 'Active', failed: 'Failed', disposed: 'Off' }

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
  if (!locked) actions.push({ id: 'toggle', label: extension.configured ? 'Turn off' : 'Turn on', icon: extension.configured ? 'x' : 'check', group: 'toggle', run: toggle })
  actions.push({ id: 'copy-id', label: 'Copy id', icon: 'copy', group: 'copy', run: copyId })
  return { title: extension.id, subtitle: extension.description, actions }
}

const toggleTitle = ({ extension, locked }: CardModel) => {
  if (locked) return 'Kept on so you can get back here'
  return extension.configured ? 'Turn off' : 'Turn on'
}

const roleChip = ({ shrinkBadge }: Kit, tone: Tone, title: string | undefined, ...children: Child[]) => span({ class: 'inline-flex min-w-0 max-w-full', title }, shrinkBadge(tone, ...children))

const status = (extension: ExtensionInfo) =>
  extension.configured && !extension.bundled
    ? span({ class: 'ml-auto shrink-0 text-xs text-danger-400', title: 'The build failed; the server log has the error' }, 'Not built')
    : span({ class: ['ml-auto shrink-0 text-xs', statusTone[extension.status] ?? 'text-neutral-500'] }, statusText[extension.status] ?? capital(extension.status))

const roleChips = (kit: Kit, { provides, needs }: CardModel) => {
  const { dot } = kit
  if (!provides.length && !needs.length) return null
  return div(
    { class: 'mt-2 flex flex-wrap gap-1' },
    provides.map(role => roleChip(kit, 'accent', undefined, span({ class: 'font-mono' }, `provides ${role}`))),
    needs.map(need => roleChip(kit, 'neutral', need.tip, dot(need.tone), span({ class: 'font-mono' }, need.role), span({ class: 'min-w-0 truncate text-neutral-500' }, need.note))),
  )
}

export const extensionCard = (kit: Kit, model: CardModel, toggle: () => void, copyId: () => void) => {
  const { contextMenu, errorText, toggleSwitch } = kit
  const { extension, locked } = model
  const menu = contextMenu()
  return div(
    { class: ['bg-neutral-900 px-4 py-3', !extension.configured && 'opacity-50'], ...menu.target(() => cardMenu(model, toggle, copyId)) },
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
    roleChips(kit, model),
    extension.error && div({ class: 'mt-2 font-mono' }, errorText(extension.error)),
  )
}
