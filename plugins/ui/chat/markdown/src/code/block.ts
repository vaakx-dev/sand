import type { Kit } from '@sand/ui-kit/contract'
import { div } from '@vaakx-dev/vrui'
import { highlight } from './highlight'

const fingerprint = (value: string) => {
  let hash = 0
  for (let index = 0; index < value.length; index++) hash = (Math.imul(hash, 31) + value.charCodeAt(index)) | 0
  return `${value.length}:${(hash >>> 0).toString(36)}`
}

export const codeBlock = (kit: Kit, code: string, language: string) =>
  kit.ownedByNode(() => div({ class: 'mb-3 last:mb-0', 'data-code': fingerprint(code) }, kit.codeBlock({ copy: () => code }, highlight(code, language))))
