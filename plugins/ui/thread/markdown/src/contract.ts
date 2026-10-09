export interface Markdown {
  nodes(source: string): Node[]
  inline(source: string): Node[]
  highlight(code: string, language: string): Node[]
}

declare module 'drydock' {
  interface Services {
    markdown: Markdown
  }
}
