import type { SshPrompt } from '../../contract'

export type PromptKind = 'notice' | 'confirm' | 'password' | 'passphrase' | 'code'

const confirmations = [/\(yes\/no[^)]*\)\??\s*$/i, /continue connecting/i]
const oneTime = /one[- ]?time|verification|\botp\b/i

export const promptKind = (text: string, askpass: string): PromptKind => {
  if (askpass === 'none') return 'notice'
  if (askpass === 'confirm' || confirmations.some(pattern => pattern.test(text))) return 'confirm'
  if (/^\s*Enter passphrase for /i.test(text)) return 'passphrase'
  if (/password:\s*$/i.test(text) && !oneTime.test(text)) return 'password'
  return 'code'
}

export const isSavable = (kind: PromptKind) => kind === 'password' || kind === 'passphrase'

export const shownPrompt = (kind: PromptKind, text: string): SshPrompt =>
  kind === 'confirm' ? { text: text.trim(), secret: false, confirm: true } : { text: text.trim(), secret: true }
