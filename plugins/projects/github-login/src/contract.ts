export interface GithubCli {
  installed: boolean
  version?: string
  old: boolean
  command?: string
}

export interface GithubPending {
  code: string
  url: string
  expires: number
}

export interface GithubState {
  login?: string
  from?: string
  pcs: number
  gh: GithubCli
  pending?: GithubPending
  error?: string
}

export interface GithubFound {
  login?: string
}

declare module '@sand/protocol/wire' {
  interface WireRequests {
    'github.status': {}
    'github.find': {}
    'github.use': {}
    'github.start': {}
    'github.cancel': {}
    'github.logout': {}
  }

  interface WireEvents {
    'github.change': [state: GithubState]
  }
}
