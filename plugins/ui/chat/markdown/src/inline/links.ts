import { label } from '../blocks/refs'
import { anchor, labelText, linkLabel, type Inline } from '../nodes'
import type { InlineScope, Scope } from '../scope'
import { closingBracket, inlineDestination, matchAt } from './syntax'

type Parse = (source: string, scope: InlineScope) => Inline[]

interface Link {
  href: string
  children: Inline[]
  title?: string
}

interface Span {
  source: string
  start: number
  end: number
}

const allowed = new Set(['http:', 'https:', 'mailto:'])
const autolink = /<([a-zA-Z][a-zA-Z\d+.-]{1,31}:[^\s<>]*)>/y
const emailAutolink = /<([\w.!#$%&'*+/=?^`{|}~-]+@[a-zA-Z\d](?:[a-zA-Z\d-]*[a-zA-Z\d])?(?:\.[a-zA-Z\d](?:[a-zA-Z\d-]*[a-zA-Z\d])?)*)>/y
const bareUrl = /https?:\/\/[^\s<]+/y
const reference = /\[([^\]]*)\]/y
const schemed = /^([a-zA-Z][a-zA-Z\d+.-]*):(.*)$/s
const lineStart = /(?:^|\n)[ \t]*$/
const noteBreak = /[ \t]*(?:[:—–-]|$)[ \t]*/my

const safeUrl = (raw: string) => {
  try {
    const url = new URL(raw.trim())
    return allowed.has(url.protocol) ? url.href : undefined
  } catch {
    return undefined
  }
}

const schemeCard = ({ href, children }: Link, scope: Scope) => {
  const [, name = '', target = ''] = schemed.exec(href.trim()) ?? []
  const found = name && scope.scheme(name.toLowerCase())
  return found ? found.render(target, children) : undefined
}

const plainLink = ({ href, children, title }: Link, scope: Scope): Node => {
  const url = safeUrl(href)
  if (url) return anchor(url, title, children)
  return scope.files?.link(href.trim(), children) ?? linkLabel(href, children)
}

const standaloneEnd = ({ source, start, end }: Span) => {
  if (!lineStart.test(source.slice(0, start))) return undefined
  const found = matchAt(noteBreak, source, end)
  return found ? end + found[0].length : undefined
}

const placeCard = (card: Node, children: Inline[], span: Span, scope: InlineScope) => {
  const cardEnd = standaloneEnd(span)
  if (cardEnd !== undefined) return { item: card, end: cardEnd }
  scope.cards.push(card)
  return { item: labelText(children), end: span.end }
}

const linkToken = (link: Link, span: Span, scope: InlineScope) => {
  const card = schemeCard(link, scope)
  return card ? placeCard(card, link.children, span, scope) : { item: plainLink(link, scope), end: span.end }
}

const imageLink = (src: string, alt: string, scope: Scope, title?: string) => plainLink({ href: src, children: [`▣ ${alt || 'image'}`], title: title ?? src }, scope)

const picture = (src: string, alt: string, scope: Scope, title?: string) => scope.image?.(src, alt) ?? imageLink(src, alt, scope, title)

const trimUrl = (url: string) => {
  let trimmed = url.replace(/[?!.,:;*_~'"]+$/, '')
  while (trimmed.endsWith(')') && trimmed.split('(').length < trimmed.split(')').length) trimmed = trimmed.slice(0, -1)
  return trimmed
}

export const bracketed = (source: string, start: number, scope: InlineScope, parse: Parse) => {
  const image = source[start] === '!'
  const open = image ? start + 1 : start
  const close = closingBracket(source, open, scope)
  if (close < 0) return undefined
  const inner = source.slice(open + 1, close)
  const build = (url: string, end: number, title?: string) =>
    image ? { item: picture(url, inner, scope, title), end } : linkToken({ href: url, children: parse(inner, scope), title }, { source, start, end }, scope)
  if (source[close + 1] === '(') {
    const target = inlineDestination(source, close + 1)
    if (target) return build(target.url, target.end, target.title)
  }
  const named = matchAt(reference, source, close + 1)
  const found = scope.refs.get(label(named?.[1] || inner))
  return found && build(found.url, close + 1 + (named?.[0].length ?? 0), found.title)
}

export const autolinkAt = (source: string, index: number, scope: InlineScope) => {
  const token = (href: string, text: string, length: number) => linkToken({ href, children: [text] }, { source, start: index, end: index + length }, scope)
  const auto = matchAt(autolink, source, index)
  if (auto) return token(auto[1]!, auto[1]!, auto[0].length)
  const email = matchAt(emailAutolink, source, index)
  if (email) return token(`mailto:${email[1]}`, email[1]!, email[0].length)
  if (source[index] !== 'h' || /[\w/]/.test(source[index - 1] ?? '')) return undefined
  const bare = matchAt(bareUrl, source, index)
  const url = bare && trimUrl(bare[0])
  return url && url.length > 8 ? token(url, url, url.length) : undefined
}
