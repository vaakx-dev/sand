export interface GrepMatch {
  path: string
  line: number
  text: string
}

export interface Files {
  list(cwd: string): Promise<string[]>
  grep(cwd: string, query: string): Promise<GrepMatch[]>
}

declare module 'drydock' {
  interface Services {
    files: Files
  }
}

declare module '@sand/protocol/wire' {
  interface WireRequests {
    'files.list': { cwd?: string }
    'files.grep': { cwd: string; query: string }
  }
}
