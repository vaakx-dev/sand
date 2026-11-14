import { label } from '../blocks/refs'
import type { LinkPlace } from '../contract'
import { anchor, linkLabel, type Inline } from '../nodes'
import type { Scope } from '../scope'
import { closingBracket, inlineDestination, matchAt } from './syntax'

type Parse = (source: string, scope: Scope) => Inline[]

const allowed = new Set(['http:', 'https:', 'mailto:'])
const autolink = /<([a-zA-Z][a-zA-Z\d+.-]{1,31}:[^\s<>]*)>/y
const emailAutolink = /<([\w.!#$%&'*+/=?^`{|}~-]+@[a-zA-Z\d](?:[a-zA-Z\d-]*[a-zA-Z\d])?(?:\.[a-zA-Z\d](?:[a-zA-Z\d-]*[a-zA-Z\d])?)*)>/y
const bareUrl = /https?:\/\/[^\s<]+/y
const reference = /\[([^\]]*)\]/y

const safeUrl = (raw: string) => {
  try {
    const url = new URL(raw.trim())
    return allowed.has(url.protocol) ? url.href : undefined
  } catch {
    return undefined
  }
}

const schemed = /^([a-zA-Z][a-zA-Z\d+.-]*):(.*)$/s

interface Link {
  href: string
  children: Inline[]
  place: LinkPlace
  title?: string
}

const placeOf = (source: string, start: number, end: number, scope: Scope): LinkPlace =>
  scope.paragraph === source && start === 0 && end === source.length ? 'block' : 'inline'

const link = ({ href, children, place, title }: Link, scope: Scope): Node => {
  const url = safeUrl(href)
  if (url) return anchor(url, title, children)
  const [, name = '', target = ''] = schemed.exec(href.trim()) ?? []
  const found = name && scope.scheme(name.toLowerCase())
  if (found) return found.render(target, children, place)
  return scope.files?.link(href.trim(), children) ?? linkLabel(href, children)
}

const imageLink = (src: string, alt: string, place: LinkPlace, scope: Scope, title?: string) =>
  link({ href: src, children: [`▣ ${alt || 'image'}`], place, title: title ?? src }, scope)

const picture = (src: string, alt: string, place: LinkPlace, scope: Scope, title?: string) =>
  scope.image?.(src, alt) ?? imageLink(src, alt, place, scope, title)

const trimUrl = (url: string) => {
  let trimmed = url.replace(/[?!.,:;*_~'"]+$/, '')
  while (trimmed.endsWith(')') && trimmed.split('(').length < trimmed.split(')').length) trimmed = trimmed.slice(0, -1)
  return trimmed
}

export const bracketed = (source: string, start: number, scope: Scope, parse: Parse) => {
  const image = source[start] === '!'
  const open = image ? start + 1 : start
  const close = closingBracket(source, open, scope)
  if (close < 0) return undefined
  const inner = source.slice(open + 1, close)
  const build = (url: string, end: number, title?: string) => {
    const place = placeOf(source, start, end, scope)
    const item = image ? picture(url, inner, place, scope, title) : link({ href: url, children: parse(inner, scope), place, title }, scope)
    return { item, end }
  }
  if (source[close + 1] === '(') {
    const target = inlineDestination(source, close + 1)
    if (target) return build(target.url, target.end, target.title)
  }
  const named = matchAt(reference, source, close + 1)
  const found = scope.refs.get(label(named?.[1] || inner))
  return found && build(found.url, close + 1 + (named?.[0].length ?? 0), found.title)
}

export const autolinkAt = (source: string, index: number, scope: Scope) => {
  const token = (href: string, text: string, length: number) => {
    const end = index + length
    return { item: link({ href, children: [text], place: placeOf(source, index, end, scope) }, scope), end }
  }
  const auto = matchAt(autolink, source, index)
  if (auto) return token(auto[1]!, auto[1]!, auto[0].length)
  const email = matchAt(emailAutolink, source, index)
  if (email) return token(`mailto:${email[1]}`, email[1]!, email[0].length)
  if (source[index] !== 'h' || /[\w/]/.test(source[index - 1] ?? '')) return undefined
  const bare = matchAt(bareUrl, source, index)
  const url = bare && trimUrl(bare[0])
  return url && url.length > 8 ? token(url, url, url.length) : undefined
}
