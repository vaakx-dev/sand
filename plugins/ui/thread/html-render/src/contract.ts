import type { Session, WireSession } from '@sand/sessions-sqlite/contract'

export interface HtmlRenderEntry {
  id: string
  title: string
  height?: number
}

export interface Artifact {
  title: string
  path: string
}

export interface LoadedPage {
  html: string
  missing: string[]
}

export interface HtmlPages {
  columnWidth: number
  maxHeight: number
  load(path: string, cwd: string): Promise<LoadedPage>
}

declare module 'drydock' {
  interface Services {
    htmlPages: HtmlPages
  }

  interface Events {
    'artifact.saved': (session: Session, artifact: Artifact) => void
  }
}

declare module '@sand/protocol/wire' {
  interface WireRequests {
    'html.page': { session: string; render: string }
  }

  interface WireEvents {
    'artifact.saved': [session: WireSession, artifact: Artifact]
  }
}
