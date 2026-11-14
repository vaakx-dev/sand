import { service, type Dispose } from 'drydock'

export interface SettledMarkdown {
  length: number
  settled: Node[]
  open: Node[]
}

export type MarkdownImage = (src: string, alt: string) => Node | undefined

export type MarkdownSize = 'reading' | 'compact'

export interface MarkdownFiles {
  link(target: string, label: (Node | string)[]): Node | undefined
  mention(text: string, label: Node): Node | undefined
}

export interface NodeOptions {
  image?: MarkdownImage
  files?: MarkdownFiles
  size?: MarkdownSize
}

export interface Markdown {
  nodes(source: string, options?: NodeOptions): Node[]
  settle(source: string, options?: NodeOptions): SettledMarkdown | undefined
  inline(source: string): (Node | string)[]
  highlight(code: string, language: string): (Node | string)[]
}

export const markdown = service<Markdown>('markdown')

export type LinkPlace = 'block' | 'inline'

export interface LinkScheme {
  scheme: string
  order?: number
  render(target: string, label: (Node | string)[], place: LinkPlace): Node
}

export interface MarkdownLinks {
  scheme(scheme: LinkScheme): Dispose
}

export const markdownLinks = service<MarkdownLinks>('markdownLinks')

export interface CodeRenderer {
  language: string
  render(code: string): Node
}

export interface MarkdownCode {
  language(renderer: CodeRenderer): Dispose
}

export const markdownCode = service<MarkdownCode>('markdownCode')
