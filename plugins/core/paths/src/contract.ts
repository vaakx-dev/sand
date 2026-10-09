export interface Paths {
  home: string
  scratchRoot(): string
  scratchFolder(id: string): string
  projectFolder(cwd: string, project?: string | null): string
}

declare module 'drydock' {
  interface Services {
    paths: Paths
  }
}
