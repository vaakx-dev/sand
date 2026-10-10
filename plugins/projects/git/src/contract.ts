export interface Branches {
  of(cwd: string, device?: string): string | undefined
}

declare module 'drydock' {
  interface Services {
    branches: Branches
  }

  interface Events {
    'branches.change': () => void
  }
}
