import type { ExtensionInfo, Extensions } from '@sand/web/contract'
import { segmented, settingsRow } from '@sand/dom'
import type { Roles } from './roles'

const roleTitles: Record<string, string> = {
  transcript: 'Chat style',
  nav: 'Sidebar',
  composer: 'Composer',
}

const capitalized = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

const sharedPrefix = (ids: string[]) => {
  const first = ids[0] ?? ''
  const parts = first.split('-')
  let length = 0
  while (length < parts.length - 1 && ids.every(id => id.split('-')[length] === parts[length])) length++
  return length
}

const optionName = (id: string, prefix: number) => capitalized(id.split('-').slice(prefix).join(' '))

export const choiceRow = (extensions: Extensions, role: string, candidates: ExtensionInfo[], roles: Roles) => {
  const active = roles.provider(role)
  const prefix = sharedPrefix(candidates.map(candidate => candidate.id))
  const only = (keep: string) => {
    for (const candidate of candidates) if (candidate.id !== keep && candidate.configured) extensions.disable(candidate.id)
    extensions.enable(keep)
  }
  const choices = candidates.map(candidate => ({ value: candidate.id, label: optionName(candidate.id, prefix), title: candidate.summary ?? candidate.description ?? candidate.id }))
  return settingsRow(roleTitles[role] ?? capitalized(role), segmented(choices, active, only))
}
