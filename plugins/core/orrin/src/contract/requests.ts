import type { Artifact, Encoding, FileHit, Job, LandOutput, LogLine, OrrinPong, OrrinProject, OrrinSymbol, OrrinView, OutlineItem, PullOutput, SearchHit } from './model'

interface Scoped {
  project: string
  view?: string
}

interface InView {
  project: string
  view: string
}

interface Written {
  clock: number
  path: string
  hash: string
  size: number
}

interface Touched {
  clock: number
  paths: string[]
}

export interface JobInput extends Scoped {
  snapshot?: string
  target: string
  args?: string[]
  pc?: string
}

interface Call<I, O> {
  input: I
  output: O
}

export interface OrrinRequests {
  ping: Call<Record<string, never>, OrrinPong>
  'projects.list': Call<Record<string, never>, { projects: OrrinProject[] }>
  'projects.import': Call<{ path: string; name?: string }, { project: OrrinProject; view: OrrinView | null; files: number }>
  'projects.remove': Call<{ project: string; delete_folder?: boolean }, Record<string, unknown>>
  'pcs.list': Call<Record<string, never>, { pcs: { id: string; name: string; me: boolean }[] }>
  log: Call<{ project: string; path?: string; before?: string; limit?: number }, { changes: { id: string; author: string; intent: string; at: number }[] }>
  'view.list': Call<{ project?: string }, { views: OrrinView[] }>
  'view.create': Call<{ project: string; owner: string; base?: string; base_view?: string; claims?: string[] }, OrrinView>
  'view.land': Call<{ view: string; intent: string; into?: string }, LandOutput>
  'view.pull': Call<{ view: string; from?: string }, PullOutput>
  'view.drop': Call<{ view: string }, Record<string, never>>
  changes: Call<InView, { base: string; files: { path: string; status: 'added' | 'modified' | 'deleted' }[] }>
  find: Call<Scoped & { pattern: string; limit?: number }, { clock: number; files: FileHit[]; truncated: boolean }>
  search: Call<
    Scoped & { query: string; regex?: boolean; case_sensitive?: boolean; paths?: string; limit?: number },
    { clock: number; hits: SearchHit[]; truncated: boolean }
  >
  read: Call<
    Scoped & { path: string; offset?: number; limit?: number; encoding?: Encoding; anchor?: string },
    {
      clock: number
      path: string
      hash: string
      size: number
      binary: boolean
      total_lines: number | null
      encoding: Encoding
      content: string | null
    }
  >
  outline: Call<Scoped & { path: string }, { clock: number; path: string; items: OutlineItem[] }>
  where: Call<Scoped & { name: string; kind?: string; limit?: number }, { clock: number; symbols: OrrinSymbol[] }>
  patch: Call<InView & { path: string; edits: { old: string; new: string; all?: boolean }[] }, Written>
  create: Call<InView & { path: string; content: string; encoding?: Encoding; overwrite?: boolean }, Written>
  move: Call<InView & { from: string; to: string }, Touched>
  delete: Call<InView & { path: string }, Touched>
  build: Call<JobInput, Job>
  run: Call<JobInput, Job>
  screenshot: Call<JobInput, Job>
  test: Call<JobInput, Job>
  export: Call<JobInput, Job>
  'job.status': Call<{ job: string }, Job>
  'job.logs': Call<{ job: string; after?: number; limit?: number; wait_ms?: number }, { lines: LogLine[]; done: boolean }>
  'job.artifacts': Call<{ job: string }, { artifacts: Artifact[] }>
  'job.cancel': Call<{ job: string }, Job>
  'objects.get': Call<{ hash: string }, { hash: string; data: string }>
}

export type OrrinRequest = keyof OrrinRequests
export type OrrinInput<R extends OrrinRequest> = OrrinRequests[R]['input']
export type OrrinOutput<R extends OrrinRequest> = OrrinRequests[R]['output']
