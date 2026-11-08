import { service, type Dispose } from 'drydock'

export interface SettledMarkdown {
  length: number
  settled: Node[]
  open: Node[]
}

export type MarkdownImage = (src: string, alt: string) => Node | undefined

/**
 * Turns markdown into nodes. Web and mail links open in a new tab; a link in a scheme registered through
 * `markdownLinks` renders through its handler; any other link shows its label as plain text.
 */
export interface Markdown {
  nodes(source: string, image?: MarkdownImage): Node[]
  settle(source: string, image?: MarkdownImage): SettledMarkdown | undefined
  inline(source: string): (Node | string)[]
  highlight(code: string, language: string): (Node | string)[]
}

export const markdown = service<Markdown>('markdown')

/**
 * Draws links in one scheme, such as `thread`: `[Fix the cache](thread:abc)` calls `render('abc', label)`.
 * Applies to markdown drawn after it registers, everywhere: transcripts, bot chats and plans.
 */
export interface LinkScheme {
  scheme: string
  render(target: string, label: (Node | string)[]): Node
}

export interface MarkdownLinks {
  scheme(scheme: LinkScheme): Dispose
}

export const markdownLinks = service<MarkdownLinks>('markdownLinks')
