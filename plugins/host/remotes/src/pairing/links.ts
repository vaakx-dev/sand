import { trimSlash } from '@sand/util'

export const pairLink = (base: string, secret: string) => `${trimSlash(base)}/#pair=${encodeURIComponent(secret)}`

export const installLink = (base: string, secret: string) => `${trimSlash(base)}/#install=${encodeURIComponent(secret)}`

export const pairSecret = (hash: string): string | undefined => {
  const secret = new URLSearchParams(hash.replace(/^#/, '')).get('pair')
  return secret || undefined
}

export const parsePairLink = (text: string): { url: string; secret: string } | undefined => {
  if (!URL.canParse(text.trim())) return
  const url = new URL(text.trim())
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return
  const secret = pairSecret(url.hash)
  return secret ? { url: url.origin, secret } : undefined
}
