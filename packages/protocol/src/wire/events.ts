import type { AgentRequest, AgentResult } from '../agents'
import type { Artifact } from '../html'
import type { LLMEvent, Limits } from '../llm'
import type { TurnResult } from '../loop'
import type { Entry, SessionInfo } from '../session'
import type { Message, ToolCallBlock, ToolResultBlock, UserContent } from '../message'
import type { CloneProgress, ProjectList } from '../projects'
import type { Remote } from '../remotes'
import type { WireJob } from './hello'
import type { RelayEvents } from './relay'
import type { SessionEvents } from './session'

export interface WireSession {
  $session: SessionInfo
}

export interface WireJobRef {
  $job: WireJob
}

export type WireAgentRequest = Omit<AgentRequest, 'parent' | 'signal'> & { parent: WireSession }

export type WireAgentResult = Omit<AgentResult, 'session'> & { session: WireSession }

export interface PluginsReloaded {
  ok: boolean
  names: string[]
}

export interface JobNote {
  id: string
  label: string
  text: string
}

export interface ForwardedEvents {
  'turn.start': [session: WireSession, prompt: Message]
  'turn.end': [session: WireSession, result: TurnResult]
  'turn.steer': [session: WireSession, content: UserContent[], id: string]
  'turn.continue': [session: WireSession, content: UserContent[]]
  'llm.event': [event: LLMEvent, session: WireSession]
  'llm.limits': [limits: Limits]
  'tool.start': [call: ToolCallBlock, session: WireSession]
  'tool.result': [result: ToolResultBlock, call: ToolCallBlock, session: WireSession]
  'agent.start': [session: WireSession, request: WireAgentRequest]
  'agent.end': [session: WireSession, result: WireAgentResult]
  'job.start': [job: WireJobRef]
  'job.end': [job: WireJobRef, output: string]
  'session.entry': [session: WireSession, entry: Entry]
  'session.update': [session: WireSession]
  'session.remove': [session: WireSession]
  'artifact.saved': [session: WireSession, artifact: Artifact]
}

export interface BroadcastEvents {
  'pair.used': [code: string]
  'remotes.change': [remotes: Remote[]]
  'projects.change': [list: ProjectList]
  'projects.progress': [progress: CloneProgress]
  'web.build': [build: string]
  'web.extensions': [enabled: Record<string, boolean>]
  'plugins.reloaded': [result: PluginsReloaded]
  'job.note': [note: JobNote]
}

export interface WireEvents extends ForwardedEvents, SessionEvents, BroadcastEvents, RelayEvents {}

export type WireEventName = keyof WireEvents

export type WireEvent = { [K in WireEventName]: { name: K; args: WireEvents[K] } }[WireEventName]
