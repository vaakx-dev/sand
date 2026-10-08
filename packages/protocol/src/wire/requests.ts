import type { CreateSession, Entry } from '../session'
import type { Prompt } from '../message'
import type { ProjectPatch } from '../projects'
import type { SessionSettings } from '../settings'
import type { SyncKind, SyncMode, SyncPick } from '../sync'
import type { UsageQuery } from '../usage'

export type WireRequest =
  | { type: 'hello' }
  | { type: 'sessions.list' }
  | { type: 'sessions.create'; options: CreateSession & { id: string } }
  | { type: 'sessions.branch'; session: string; into: string; at?: string | null }
  | { type: 'session.open'; session: string }
  | { type: 'session.append'; session: string; entry: Entry }
  | { type: 'session.checkout'; session: string; entry: string | null }
  | { type: 'sessions.remove'; session: string }
  | { type: 'session.rename'; session: string; title: string; named?: boolean }
  | { type: 'loop.run'; session: string; prompt: Prompt }
  | { type: 'loop.steer'; session: string; prompt: Prompt; label?: string }
  | { type: 'loop.unsteer'; session: string; item: string }
  | { type: 'queue.add'; session: string; prompt: Prompt; label?: string }
  | { type: 'queue.remove'; session: string; item: string }
  | { type: 'queue.edit'; session: string; item: string; prompt: Prompt; label?: string }
  | { type: 'queue.move'; session: string; item: string; index: number }
  | { type: 'queue.send'; session: string; item: string }
  | { type: 'queue.get'; session: string }
  | { type: 'settings.get'; session?: string; settings?: SessionSettings }
  | { type: 'context.get'; session: string }
  | { type: 'loop.interrupt'; session: string }
  | { type: 'job.cancel'; job: string }
  | { type: 'skills.list' }
  | { type: 'limits.refresh' }
  | ({ type: 'usage.summary' } & UsageQuery)
  | { type: 'ui.command'; name: string; args: string; session?: string; cwd?: string; settings?: SessionSettings }
  | { type: 'ui.pick.result'; pick: string; index: number | null; action?: string; query?: string }
  | { type: 'ui.input.result'; input: string; value: string | null }
  | { type: 'ui.focus'; session?: string }
  | { type: 'files.list'; cwd?: string }
  | { type: 'files.grep'; cwd: string; query: string }
  | { type: 'fs.browse'; path: string }
  | { type: 'fs.mkdir'; path: string }
  | { type: 'projects.list' }
  | { type: 'projects.icon'; path: string }
  | { type: 'projects.add'; path: string; link?: string }
  | { type: 'projects.update'; path: string; patch: ProjectPatch }
  | { type: 'projects.root'; root: string }
  | { type: 'projects.remove'; path: string }
  | { type: 'projects.create'; name: string }
  | { type: 'projects.clone'; url: string; into: string; job?: string }
  | { type: 'sync.state'; path: string }
  | { type: 'sync.inspect'; path: string }
  | { type: 'sync.export'; path: string; kind: SyncKind; have?: string[] }
  | { type: 'sync.pull'; transfer: string; index: number }
  | { type: 'sync.push'; transfer: string; index: number; data: string }
  | { type: 'sync.import'; transfer: string; kind: SyncKind; path: string; chunks: number; commit?: string; branch?: string; remotes?: Record<string, string> }
  | { type: 'sync.apply'; path: string; commit: string; mode?: SyncMode }
  | { type: 'sync.resolve'; path: string; picks: Record<string, SyncPick> }
  | { type: 'sync.setup'; path: string; command: string }
  | { type: 'device.info' }
  | { type: 'remotes.list' }
  | { type: 'remotes.add'; link: string }
  | { type: 'remotes.remove'; id: string }
  | { type: 'web.extensions' }
  | { type: 'web.extensions.set'; extension: string; enabled: boolean | null }
  | { type: 'web.extensions.reset' }
  | { type: 'git.branch'; cwd: string }
  | { type: 'session.pin'; session: string; pinned: boolean }
  | { type: 'session.settle'; session: string; settled: boolean }
  | { type: 'session.seen'; session: string; at: number }
  | { type: 'session.move'; session: string; position: number }
  | { type: 'server.urls' }
  | { type: 'server.lan' }
  | { type: 'server.pair' }
  | { type: 'html.page'; session: string; render: string }

export type WireRequestType = WireRequest['type']

export type WireRequestOf<K extends WireRequestType> = Extract<WireRequest, { type: K }>

export type ClientMessage = WireRequest & { id: number }

export type ServerMessage =
  | { type: 'result'; id: number; result?: unknown; error?: string }
  | { type: 'event'; name: string; args: unknown[] }
