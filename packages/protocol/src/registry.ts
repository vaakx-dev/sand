import type { AgentRequest, AgentResult, Agents, Job } from './agents'
import type { Attachments } from './attachments'
import type { Cli } from './cli'
import type { Files } from './files'
import type { Artifact, HtmlPages } from './html'
import type { Limits, LLM, LLMEvent, LLMRequest } from './llm'
import type { ContextBuilder, ContextUsage, FollowUps, Loop, TurnResult } from './loop'
import type { Message, ToolCallBlock, ToolResultBlock, UserContent } from './message'
import type { Remotes } from './remotes'
import type { Server } from './server'
import type { Skills } from './skills'
import type { Entry, Session, Sessions } from './session'
import type { ModelSettings } from './settings'
import type { Tools } from './tools'
import type { UI } from './ui'
import type { Hello, JobNote, PluginsReloaded } from './wire'

declare module 'drydock' {
  interface Services {
    cli: Cli
    llm: LLM
    sessions: Sessions
    tools: Tools
    context: ContextBuilder
    loop: Loop
    ui: UI
    agents: Agents
    server: Server
    remotes: Remotes
    attachments: Attachments
    skills: Skills
    modelSettings: ModelSettings
    files: Files
    followUps: FollowUps
    htmlPages: HtmlPages
  }

  interface Events {
    'turn.start': (session: Session, prompt: Message) => void
    'turn.end': (session: Session, result: TurnResult) => void
    'turn.steer': (session: Session, content: UserContent[], id: string) => void
    'turn.stop': (session: Session, result: TurnResult, signal: AbortSignal) => UserContent[] | undefined
    'turn.continue': (session: Session, content: UserContent[]) => void
    'turn.queue': (session: Session) => void
    'context.usage': (session: Session, usage: ContextUsage) => void
    'modelSettings.change': (session: Session) => void
    'modelSettings.defaults': () => void
    'turn.prompt': (content: UserContent[], session: Session) => UserContent[]
    'context.build': (request: LLMRequest, session: Session, signal?: AbortSignal) => LLMRequest
    'context.overflow': (session: Session, error: unknown, signal: AbortSignal) => boolean | undefined
    'llm.event': (event: LLMEvent, session: Session) => void
    'llm.limits': (limits: Limits) => void
    'llm.response': (message: Message, session: Session) => Message
    'tool.start': (call: ToolCallBlock, session: Session) => void
    'tool.result': (result: ToolResultBlock, call: ToolCallBlock, session: Session) => ToolResultBlock
    'agent.start': (session: Session, request: AgentRequest) => void
    'agent.end': (session: Session, result: AgentResult) => void
    'job.start': (job: Job) => void
    'job.end': (job: Job, output: string) => void
    'job.note': (note: JobNote) => void
    'plugins.reloaded': (result: PluginsReloaded) => void
    'server.hello': (hello: Hello) => Hello
    'session.entry': (session: Session, entry: Entry) => void
    'session.update': (session: Session) => void
    'session.remove': (session: Session) => void
    'artifact.saved': (session: Session, artifact: Artifact) => void
  }
}
