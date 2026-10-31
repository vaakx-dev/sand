import type { GitStatus } from '@sand/git/contract'
import type { Child } from '@vaakx-dev/vrui'
import type { ControlParts } from '../parts'

export const sectionItems = (parts: ControlParts, status: GitStatus, close: () => void): Child[] => {
  const { ctx, kit, model, sections, waiting } = parts
  const place = model.place.get()
  if (!place) return []
  const id = model.thread.get()
  const thread = id ? ctx.threads.get(id) : undefined
  return sections.render({ status, place, thread, waiting: waiting.get(), close }).flatMap(items => [kit.menuSeparator(), ...items])
}
