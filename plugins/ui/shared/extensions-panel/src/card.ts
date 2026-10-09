import type { ExtensionInfo } from '@sand/web/contract'
import { div, dot, span, toggleSwitch, type Tone } from '@sand/dom'
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

const dependency = (role: string, provider: string | undefined, hard: boolean, fallback?: string): Dependency => ({
  role,
  tone: provider ? 'success' : hard ? 'danger' : 'warning',
  note: provider ? `← ${provider}` : hard ? 'waiting' : `fallback: ${fallback}`,
  tip: provider ? `${role} comes from ${provider}` : hard ? `Waits for an extension that provides ${role}` : `Nothing provides ${role}, so ${fallback}`,
})

export const cardModel = (extension: ExtensionInfo, roles: Roles, locked: boolean): CardModel => ({
  extension,
  provides: roles.provides(extension),
  needs: [
    ...extension.inject.map(role => dependency(role, roles.provider(role), true)),
    ...Object.entries(extension.uses).map(([role, fallback]) => dependency(role, roles.provider(role), false, fallback)),
  ],
  locked,
})

const chip = 'inline-flex min-h-5 max-w-full items-center gap-1 rounded-md px-2 font-mono text-xs'

const status = (extension: ExtensionInfo) =>
  extension.configured && !extension.bundled
    ? span({ class: 'ml-auto shrink-0 text-xs text-danger-400', title: 'The build failed; the server log has the error' }, 'not built')
    : span({ class: ['ml-auto shrink-0 text-xs', statusTone[extension.status] ?? 'text-neutral-500'] }, statusText[extension.status] ?? extension.status)

export const extensionCard = ({ extension, provides, needs, locked }: CardModel, toggle: () => void) =>
  div(
    { class: ['mb-2 rounded-xl bg-neutral-800 p-3', extension.configured ? '' : 'opacity-50'] },
    div(
      { class: 'flex min-w-0 items-center gap-3' },
      toggleSwitch({
        on: extension.configured,
        disabled: locked,
        title: locked ? 'Kept on so you can get back here' : extension.configured ? 'Disable' : 'Enable',
        onClick: toggle,
      }),
      span({ class: 'shrink-0 font-mono text-sm font-semibold text-neutral-100' }, extension.id),
      span(
        { class: 'hidden min-w-0 flex-1 truncate text-xs text-neutral-400 md:block', title: extension.description ?? '' },
        extension.description ?? (extension.bundled ? '' : 'not in this build'),
      ),
      status(extension),
    ),
    provides.length || needs.length
      ? div(
          { class: 'mt-2 flex flex-wrap gap-1' },
          provides.map(role => span({ class: [chip, 'bg-accent-950 text-accent-400'] }, `provides ${role}`)),
          needs.map(need =>
            span({ class: [chip, 'bg-neutral-700 text-neutral-400'], title: need.tip }, dot(need.tone), need.role, span({ class: 'truncate font-sans text-neutral-500' }, need.note)),
          ),
        )
      : null,
    extension.error && div({ class: 'mt-2 whitespace-pre-wrap wrap-anywhere font-mono text-xs text-danger-400' }, extension.error),
  )
