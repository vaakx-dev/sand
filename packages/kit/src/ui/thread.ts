import type { ModelSettings, Sessions, UI } from '@sand/protocol'

export const commandThread = (ui: UI, sessions: Sessions, modelSettings?: ModelSettings) => {
  const current = ui.session()
  if (current) return current
  const created = sessions.create({ cwd: ui.cwd() })
  const settings = ui.draft?.()
  if (settings && Object.keys(settings).length) modelSettings?.update(created, settings)
  ui.open(created)
  return created
}
