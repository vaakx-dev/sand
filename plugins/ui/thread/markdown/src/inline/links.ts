import { label } from '../blocks/refs'
import { anchor, blockedLink, type Inline } from '../nodes'
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

const link = (href: string, children: Inline[], title?: string): Node => {
  const url = safeUrl(href)
  return url ? anchor(url, title, children) : blockedLink(href, children)
}

const imageLink = (src: string, alt: string, title?: string) => link(src, [`▣ ${alt || 'image'}`], title ?? src)

const picture = (src: string, alt: string, title: string | undefined, scope: Scope) => {
  const shown = safeUrl(src) ? undefined : scope.image?.(src, alt)
  return shown ?? imageLink(src, alt, title)
}

const trimUrl = (url: string) => {
  let trimmed = url.replace(/[?!.,:;*_~'"]+$/, '')
  while (trimmed.endsWith(')') && trimmed.split('(').length < trimmed.split(')').length) trimmed = trimmed.slice(0, -1)
  return trimmed
}

export const bracketed = (source: string, start: number, scope: Scope, parse: Parse) => {
  const image = source[start] === '!'
  const open = image ? start + 1 : start
  const close = closingBracket(source, open)
  if (close < 0) return undefined
  const inner = source.slice(open + 1, close)
  const build = (url: string, end: number, title?: string) => ({
    item: image ? picture(url, inner, title, scope) : link(url, parse(inner, scope), title),
    end,
  })
  if (source[close + 1] === '(') {
    const target = inlineDestination(source, close + 1)
    if (target) return build(target.url, target.end, target.title)
  }
  const named = matchAt(reference, source, close + 1)
  const found = scope.refs.get(label(named?.[1] || inner))
  return found && build(found.url, close + 1 + (named?.[0].length ?? 0), found.title)
}

export const autolinkAt = (source: string, index: number) => {
  const auto = matchAt(autolink, source, index)
  if (auto) return { item: link(auto[1]!, [auto[1]!]), end: index + auto[0].length }
  const email = matchAt(emailAutolink, source, index)
  if (email) return { item: link(`mailto:${email[1]}`, [email[1]!]), end: index + email[0].length }
  if (source[index] !== 'h' || /[\w/]/.test(source[index - 1] ?? '')) return undefined
  const bare = matchAt(bareUrl, source, index)
  const url = bare && trimUrl(bare[0])
  return url && url.length > 8 ? { item: link(url, [url]), end: index + url.length } : undefined
}
