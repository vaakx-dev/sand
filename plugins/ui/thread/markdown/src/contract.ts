export interface SettledMarkdown {
  length: number
  settled: Node[]
  open: Node[]
}

export interface Markdown {
  nodes(source: string): Node[]
  settle(source: string): SettledMarkdown | undefined
  inline(source: string): (Node | string)[]
  highlight(code: string, language: string): (Node | string)[]
}

declare module 'drydock' {
  interface Services {
    markdown: Markdown
  }
}
