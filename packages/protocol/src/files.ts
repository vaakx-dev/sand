export interface GrepMatch {
  path: string
  line: number
  text: string
}

export interface Files {
  list(cwd: string): Promise<string[]>
  grep(cwd: string, query: string): Promise<GrepMatch[]>
}
