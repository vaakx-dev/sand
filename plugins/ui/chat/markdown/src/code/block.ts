import type { Kit } from '@sand/ui-kit/contract'
import { collectScope, disposeAll, div, el, onDisconnect } from '@vaakx-dev/vrui'
import { highlight } from './highlight'

const fingerprint = (value: string) => {
  let hash = 0
  for (let index = 0; index < value.length; index++) hash = (Math.imul(hash, 31) + value.charCodeAt(index)) | 0
  return `${value.length}:${(hash >>> 0).toString(36)}`
}

const ownedByNode = <T extends Node>(build: () => T): T => {
  const { value, scope } = collectScope(build)
  collectScope(() => onDisconnect(value, () => disposeAll(scope)))
  return value
}

const copyCode = ({ copyButton }: Kit, code: string) => ownedByNode(() => copyButton({ text: () => code, 'data-code': fingerprint(code) }))

export const codeBlock = (kit: Kit, code: string, language: string) =>
  div(
    { class: 'mb-3 last:mb-0 overflow-hidden rounded-xl bg-neutral-800' },
    div({ class: 'flex h-8 items-center justify-between bg-neutral-700 pr-1 pl-3 font-mono text-xs text-neutral-500' }, language || 'text', copyCode(kit, code)),
    el('pre', { class: 'overflow-auto px-3 py-2 text-sm' }, el('code', { class: 'font-mono text-xs whitespace-pre text-neutral-300' }, highlight(code, language))),
  )
