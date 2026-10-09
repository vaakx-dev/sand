import type { AgentRequest, AgentResult } from '../agents'
import type { HostRoute, NetworkState, PairedDevice, TailscaleState } from '../devices'
import type { Artifact } from '../html'
import type { InstallProgress } from '../install'
import type { LLMEvent, Limits } from '../llm'
import type { LoginState } from '../login'
import type { TurnResult } from '../loop'
import type { Entry, SessionInfo } from '../session'
import type { Message, ToolCallBlock, ToolResultBlock, UserContent } from '../message'
import type { PluginLibrary } from '../plugin-library'
import type { PluginSyncState } from '../plugin-sync'
import type { CloneProgress, ProjectList } from '../projects'
import type { PcList } from '../pcs'
import type { Remote } from '../remotes'
import type { RuntimeChange } from '../runtime'
import type { UpdateState } from '../updates'
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
  'pair.used': [device: PairedDevice, inviteExpires: number]
  'devices.change': [devices: PairedDevice[]]
  'network.change': [network: NetworkState]
  'routes.change': [routes: HostRoute[]]
  'tailscale.change': [state: TailscaleState]
  'remotes.change': [remotes: Remote[]]
  'pcs.change': [list: PcList]
  'install.progress': [progress: InstallProgress]
  'projects.change': [list: ProjectList]
  'projects.progress': [progress: CloneProgress]
  'plugins.change': [state: PluginSyncState]
  'plugins.library': [library: PluginLibrary]
  'updates.change': [state: UpdateState]
  'web.build': [build: string]
  'web.extensions': [enabled: Record<string, boolean>]
  'job.note': [note: JobNote]
  'skills.change': []
  'runtime.changed': [change: RuntimeChange]
  'runtime.failed': [error: string]
  'login.change': [state: LoginState]
}

export interface WireEvents extends ForwardedEvents, SessionEvents, BroadcastEvents, RelayEvents {}

export type WireEventName = keyof WireEvents

export type WireEvent = { [K in WireEventName]: { name: K; args: WireEvents[K] } }[WireEventName]
