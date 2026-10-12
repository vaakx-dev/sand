import type { ExtensionInfo, Extensions } from '@sand/web/contract'
import { capital } from '@sand/kit'
import type { Pulse } from '@sand/kit/web'
import type { Kit } from '@sand/ui-kit/contract'
import { div, dynamicChild } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { interfaceState, type Roles } from './roles'

const roleTitles: Record<string, string> = {
  transcript: 'Chat style',
  sidebar: 'Sidebar',
  composer: 'Composer',
  kit: 'Look',
}

const sharedPrefix = (ids: string[]) => {
  const first = ids[0] ?? ''
  const parts = first.split('-')
  let length = 0
  while (length < parts.length - 1 && ids.every(id => id.split('-')[length] === parts[length])) length++
  return length
}

const optionName = (id: string, prefix: number) => capital(id.split('-').slice(prefix).join(' '))

const choiceRow = ({ segmented, settingsRow }: Kit, extensions: Extensions, role: string, candidates: ExtensionInfo[], roles: Roles) => {
  const prefix = sharedPrefix(candidates.map(candidate => candidate.id))
  const only = (keep: string) => {
    extensions.enable(keep)
    for (const candidate of candidates) if (candidate.id !== keep && candidate.configured) extensions.disable(candidate.id)
  }
  const choices = candidates.map(candidate => ({ value: candidate.id, label: candidate.label ?? optionName(candidate.id, prefix), title: candidate.summary ?? candidate.description ?? candidate.id }))
  return settingsRow(roleTitles[role] ?? capital(role), segmented(choices, roles.provider(role), only))
}

export const interfacePage = (ctx: Context<'extensions' | 'kit'>, changes: Pulse) => {
  const { settingsSection } = ctx.kit
  return settingsSection(
    {},
    dynamicChild(interfaceState(ctx, changes), ({ roles }) =>
      div({ class: 'contents' }, roles.swaps().map(group => choiceRow(ctx.kit, ctx.extensions, group.role, group.candidates, roles))),
    ),
  )
}
