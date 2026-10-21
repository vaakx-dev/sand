export interface OrrinProject {
  id: string
  name: string
  home_pc: string
  main: string
  settings: OrrinProjectSettings
  created_at: number
}

export interface OrrinProjectSettings {
  ignore: string[]
  git: { remote: string; branch: string } | null
}

export interface OrrinPong {
  pc: string
  name: string
  version: string
  pid: number
}

export interface OrrinView {
  id: string
  project: string
  owner: string
  kind: 'user' | 'worker'
  path: string
  base: string
  base_view?: string | null
  claims: string[]
  state: 'open' | 'landed' | 'dropped'
  created_at: number
  landed: string | null
}

export interface Conflict {
  path: string
  reason: string
}

export interface LandOutput {
  landed: boolean
  change: { id: string; intent: string } | null
  main: string
  conflicts: Conflict[]
  skipped: string[]
}

export interface PullOutput {
  changed: string[]
  conflicts: Conflict[]
}

export type JobKind = 'build' | 'run' | 'screenshot' | 'test' | 'export'

export type JobState = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled'

export interface Job {
  id: string
  project: string
  kind: JobKind
  target: string
  snapshot: string
  pc: string
  state: JobState
  cached: boolean
  exit_code: number | null
  error: string | null
  created_at: number
  started_at: number | null
  finished_at: number | null
  result?: string | null
}

export interface LogLine {
  n: number
  stream: 'stdout' | 'stderr' | 'system'
  text: string
  at: number
}

export interface Artifact {
  path: string
  hash: string
  size: number
}

export interface FileHit {
  path: string
  size: number
  heading?: string
  anchor?: string
}

export interface SearchHit {
  path: string
  line: number
  column: number
  text: string
  anchor?: string
}

export interface OrrinSymbol {
  name: string
  kind: string
  path: string
  line: number
  container: string | null
}

export interface OutlineItem {
  kind: string
  name: string
  depth: number
  line: number | null
  anchor?: string
}

export type Encoding = 'utf8' | 'base64'

export type OrrinEvent =
  | { type: 'project.created'; project: OrrinProject }
  | { type: 'main.moved'; project: string; main: string; change: string }
  | { type: 'view.changed'; view: string; paths: string[]; clock: number }
  | { type: 'view.landed'; view: string; change: string | null; into: string | null }
  | { type: 'view.conflicts'; view: string; conflicts: unknown[] }
  | { type: 'view.skipped'; view: string; paths: string[] }
  | { type: 'index.updated'; project: string; view: string | null; clock: number }
  | { type: 'job'; job: Job }
  | { type: 'job.log'; job: string; line: LogLine }
  | { type: 'pc.seen'; pc: unknown }
  | { type: 'maintenance'; thinned: number; packages: number; removed: number; freed: number }

export interface OrrinEnvelope {
  seq: number
  at: number
  event: OrrinEvent
}
