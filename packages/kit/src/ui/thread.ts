import type { ModelSettings } from '@sand/model/contract'
import type { UI } from '@sand/server/contract'
import type { Sessions } from '@sand/sessions-sqlite/contract'

export const commandThread = (ui: UI, sessions: Sessions, modelSettings?: ModelSettings) => {
  const current = ui.session()
  if (current) return current
  const created = sessions.create({ cwd: ui.cwd() })
  const settings = ui.draft?.()
  if (settings && Object.keys(settings).length) modelSettings?.update(created, settings)
  ui.open(created)
  return created
}
