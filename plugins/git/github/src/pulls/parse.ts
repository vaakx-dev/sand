import { githubHost } from '../api/endpoint'
import type { PullRef } from '../contract'

const escaped = githubHost.replace(/\./g, '\\.')
const urlPattern = new RegExp(`^(?:https?://)?(?:www\\.)?${escaped}/([\\w.-]+/[\\w.-]+)/pulls?/(\\d+)(?:[/?#].*)?$`, 'i')
const fullPattern = /^([\w.-]+\/[\w.-]+)#(\d+)$/
const shortPattern = /^#?(\d+)$/

export type ParsedRef = PullRef | { repo?: undefined; number: number }

const positive = (text: string | undefined) => {
  const number = Number(text)
  return Number.isSafeInteger(number) && number > 0 ? number : undefined
}

export const parsePullRef = (text: string): ParsedRef | undefined => {
  const trimmed = text.trim()
  const match = urlPattern.exec(trimmed) ?? fullPattern.exec(trimmed)
  if (match?.[1]) {
    const number = positive(match[2])
    return number ? { repo: match[1], number } : undefined
  }
  const number = positive(shortPattern.exec(trimmed)?.[1])
  return number ? { number } : undefined
}
