export interface CoreRequests {
  'git.branch': { cwd: string }
  'git.branches': { cwds: string[] }
}
