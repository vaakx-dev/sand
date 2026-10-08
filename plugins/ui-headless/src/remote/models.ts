import type { Hello, OpenedSession, SettingsState } from '@sand/protocol'
import type { ModelLookup } from '../follow/models'

export const remoteModels = (hello: Hello, opened?: OpenedSession) => {
  const known = new Map<string, string | undefined>()
  if (opened?.settings) known.set(opened.info.id, opened.settings.current.model)
  const lookup: ModelLookup = {
    model: session => (known.has(session) ? known.get(session) : hello.defaults?.model),
    label: model => hello.models?.find(info => info.id === model)?.label ?? model,
  }
  return { ...lookup, seen: (session: string, state: SettingsState) => void known.set(session, state.current.model) }
}

export type RemoteModels = ReturnType<typeof remoteModels>
