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
