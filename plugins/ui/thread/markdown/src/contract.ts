export interface SettledMarkdown {
  length: number
  settled: Node[]
  open: Node[]
}

export type MarkdownImage = (src: string, alt: string) => Node | undefined

export interface Markdown {
  nodes(source: string, image?: MarkdownImage): Node[]
  settle(source: string, image?: MarkdownImage): SettledMarkdown | undefined
  inline(source: string): (Node | string)[]
  highlight(code: string, language: string): (Node | string)[]
}

declare module 'drydock' {
  interface Services {
    markdown: Markdown
  }
}
