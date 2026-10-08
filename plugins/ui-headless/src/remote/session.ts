import type { Cli, Entry, Hello, OpenedSession, RemoteClient, SessionInfo, SessionSettings } from '@sand/protocol'
import { uuid } from '@sand/kit'

export const remoteFolder = (cli: Cli, hello: Hello) => cli.flags.cwd ?? hello.cwd

export const existingSession = async (client: RemoteClient, cli: Cli, hello: Hello) => {
  const { resume, continue: latest } = cli.flags
  if (resume) return client.call<OpenedSession>({ type: 'session.open', session: resume })
  const folder = remoteFolder(cli, hello)
  const recent = latest ? hello.sessions.find(session => session.cwd === folder && session.kind !== 'agent') : undefined
  return recent && client.call<OpenedSession>({ type: 'session.open', session: recent.id })
}

export const chooseSession = async (client: RemoteClient, cli: Cli, hello: Hello): Promise<OpenedSession> => {
  const existing = await existingSession(client, cli, hello)
  if (existing) return existing
  const folder = remoteFolder(cli, hello)
  const info = await client.call<SessionInfo>({ type: 'sessions.create', options: { id: uuid(), cwd: folder } })
  if (info.cwd !== folder) throw new Error(`${folder} is not a folder on that PC`)
  return { info, entries: [] }
}

const lastSettings = (opened: OpenedSession) =>
  (opened.entries.findLast(entry => entry.type === 'settings')?.data as SessionSettings | undefined) ?? {}

export const applyFlags = async (client: RemoteClient, opened: OpenedSession, flags?: SessionSettings) => {
  if (!flags) return
  const data = { ...lastSettings(opened), ...flags }
  const entry: Entry = { id: uuid(), session: opened.info.id, parent: opened.info.head, at: Date.now(), type: 'settings', data }
  await client.call({ type: 'session.append', session: opened.info.id, entry })
}
